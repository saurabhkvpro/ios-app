import AsyncStorage from '@react-native-async-storage/async-storage';

const API_LOGGER_KEY = '@api_logger_enabled';
const API_LOGS_KEY = '@api_logs';
const MAX_LOGS = 100; // Keep only last 100 logs

class APILogger {
  constructor() {
    this.enabled = false;
    this.logs = [];
    this.loadState();
  }

  async loadState() {
    try {
      const enabled = await AsyncStorage.getItem(API_LOGGER_KEY);
      this.enabled = enabled === 'true';

      const logsStr = await AsyncStorage.getItem(API_LOGS_KEY);
      this.logs = logsStr ? JSON.parse(logsStr) : [];
    } catch (error) {
      console.error('Failed to load API logger state:', error);
    }
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(API_LOGGER_KEY, this.enabled.toString());
      await AsyncStorage.setItem(API_LOGS_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save API logger state:', error);
    }
  }

  async enable() {
    this.enabled = true;
    await this.saveState();
  }

  async disable() {
    this.enabled = false;
    await this.saveState();
  }

  isEnabled() {
    return this.enabled;
  }

  async logRequest(config, retryCount = 0) {
    if (!this.enabled) return null;

    const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const log = {
      id: logId,
      timestamp: new Date().toISOString(),
      request: {
        method: config.method?.toUpperCase() || 'GET',
        url: config.url || '',
        headers: this.sanitizeHeaders(config.headers || {}),
        params: config.params || null,
        data: this.sanitizeData(config.data),
      },
      response: null,
      error: null,
      duration: null,
      retries: retryCount,
      attempts: [], // Track each retry attempt
      startTime: Date.now(),
    };

    // Add to logs array (keep only last MAX_LOGS)
    this.logs.unshift(log);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    await this.saveState();
    return logId;
  }

  async logAttempt(logId, attemptNumber, response, error = null) {
    if (!this.enabled || !logId) return;

    const log = this.logs.find(l => l.id === logId);
    if (!log) return;

    const attemptEndTime = Date.now();
    const attemptDuration = attemptEndTime - (log.attemptStartTime || log.startTime);

    const attempt = {
      attemptNumber,
      timestamp: new Date().toISOString(),
      duration: attemptDuration,
      response: null,
      error: null,
    };

    if (error) {
      attempt.error = {
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        code: error.code || null,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: this.sanitizeData(error.response.data),
        } : null,
      };
    } else if (response) {
      attempt.response = {
        status: response.status,
        statusText: response.statusText || '',
        data: this.sanitizeData(response.data),
      };
    }

    log.attempts.push(attempt);
    log.attemptStartTime = attemptEndTime; // Track for next attempt

    await this.saveState();
  }

  async logResponse(logId, response, error = null) {
    if (!this.enabled || !logId) return;

    const log = this.logs.find(l => l.id === logId);
    if (!log) return;

    const endTime = Date.now();
    log.duration = endTime - log.startTime;

    if (error) {
      log.error = {
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        code: error.code || null,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: this.sanitizeData(error.response.data),
        } : null,
      };
    } else if (response) {
      log.response = {
        status: response.status,
        statusText: response.statusText || '',
        headers: this.sanitizeHeaders(response.headers || {}),
        data: this.sanitizeData(response.data),
      };
    }

    delete log.startTime;
    delete log.attemptStartTime;
    await this.saveState();
  }

  async updateRetryCount(logId, retryCount) {
    if (!this.enabled || !logId) return;

    const log = this.logs.find(l => l.id === logId);
    if (!log) return;

    log.retries = retryCount;
    await this.saveState();
  }

  getLogs() {
    return [...this.logs];
  }

  async clearLogs() {
    this.logs = [];
    await this.saveState();
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveKeys = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
      if (sanitized[key.toLowerCase()]) {
        sanitized[key.toLowerCase()] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  sanitizeData(data) {
    if (!data) return null;

    try {
      // Convert to JSON string if object
      let jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

      // Redact sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
        'accessToken',
        'refreshToken',
      ];

      sensitiveFields.forEach(field => {
        const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi');
        jsonStr = jsonStr.replace(regex, `"${field}":"***REDACTED***"`);
      });

      return JSON.parse(jsonStr);
    } catch (error) {
      return data;
    }
  }
}

// Export singleton instance
export default new APILogger();
