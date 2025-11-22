import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StatusBar,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../constants/theme';
import ApiLogger from '../services/api.logger';

export default function APILoggerScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadLogs();
    setIsEnabled(ApiLogger.isEnabled());
  }, []);

  const loadLogs = () => {
    const allLogs = ApiLogger.getLogs();
    setLogs(allLogs);
  };

  const toggleLogger = (value) => {
    if (value) {
      ApiLogger.enable();
    } else {
      ApiLogger.disable();
    }
    setIsEnabled(value);
    loadLogs();
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all API logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            ApiLogger.clearLogs();
            loadLogs();
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Content copied to clipboard');
  };

  const generateCurl = (log) => {
    const { request } = log;
    let curl = `curl -X ${request.method} "${request.url}"`;

    if (request.headers) {
      Object.entries(request.headers).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    if (request.data && request.method !== 'GET') {
      const dataStr = typeof request.data === 'string'
        ? request.data
        : JSON.stringify(request.data);
      curl += ` \\\n  -d '${dataStr}'`;
    }

    return curl;
  };

  const getStatusColor = (status) => {
    if (!status) return COLORS.textColor;
    if (status >= 200 && status < 300) return '#10B981';
    if (status >= 300 && status < 400) return '#F59E0B';
    if (status >= 400 && status < 500) return '#EF4444';
    if (status >= 500) return '#DC2626';
    return COLORS.textColor;
  };

  const toggleExpand = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const renderLog = (log, index) => {
    const isExpanded = expandedLog === log.id;
    const curl = generateCurl(log);
    const statusColor = getStatusColor(log.response?.status);

    return (
      <View key={log.id} style={styles.logCard}>
        <TouchableOpacity onPress={() => toggleExpand(log.id)} activeOpacity={0.8}>
          <View style={styles.logHeader}>
            <View style={styles.logHeaderLeft}>
              <Text style={[styles.method, { color: getMethodColor(log.request.method) }]}>
                {log.request.method}
              </Text>
              <Text style={styles.endpoint} numberOfLines={1}>
                {log.request.url.replace(/^https?:\/\/[^\/]+/, '')}
              </Text>
            </View>
            <View style={styles.logHeaderRight}>
              {log.response?.status && (
                <Text style={[styles.status, { color: statusColor }]}>
                  {log.response.status}
                </Text>
              )}
              {log.retries > 0 && (
                <Text style={styles.retries}>🔄 {log.retries}</Text>
              )}
            </View>
          </View>
          <Text style={styles.timestamp}>
            {new Date(log.timestamp).toLocaleString()}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* cURL Command */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>cURL Command</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(curl)}
                >
                  <Text style={styles.copyButtonText}>📋 Copy</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal style={styles.codeBlock}>
                <Text style={styles.codeText}>{curl}</Text>
              </ScrollView>
            </View>

            {/* Request Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>URL:</Text>
                <Text style={styles.detailValue} selectable>{log.request.url}</Text>
              </View>
              {log.request.params && Object.keys(log.request.params).length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Params:</Text>
                  <Text style={styles.detailValue} selectable>
                    {JSON.stringify(log.request.params, null, 2)}
                  </Text>
                </View>
              )}
              {log.request.data && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Body:</Text>
                  <Text style={styles.detailValue} selectable>
                    {typeof log.request.data === 'string'
                      ? log.request.data
                      : JSON.stringify(log.request.data, null, 2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Response Details */}
            {log.response && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Response Details</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(JSON.stringify(log.response.data, null, 2))}
                  >
                    <Text style={styles.copyButtonText}>📋 Copy</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: statusColor }]}>
                    {log.response.status} {log.response.statusText}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{log.duration}ms</Text>
                </View>
                {log.response.data && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Data:</Text>
                    <ScrollView style={styles.jsonScroll} nestedScrollEnabled>
                      <Text style={styles.jsonText} selectable>
                        {JSON.stringify(log.response.data, null, 2)}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Error Details */}
            {log.error && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Error Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Message:</Text>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]} selectable>
                    {log.error.message}
                  </Text>
                </View>
                {log.error.stack && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stack:</Text>
                    <ScrollView style={styles.jsonScroll} nestedScrollEnabled>
                      <Text style={styles.codeText} selectable>
                        {log.error.stack}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Retry Attempts Timeline */}
            {log.attempts && log.attempts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Retry Timeline ({log.attempts.length} attempt{log.attempts.length > 1 ? 's' : ''})
                </Text>
                {log.attempts.map((attempt, idx) => (
                  <View key={idx} style={styles.attemptCard}>
                    <View style={styles.attemptHeader}>
                      <Text style={styles.attemptNumber}>
                        Attempt #{attempt.attemptNumber}
                      </Text>
                      <Text style={styles.attemptDuration}>
                        {attempt.duration}ms
                      </Text>
                      {attempt.response?.status && (
                        <Text style={[styles.attemptStatus, { color: getStatusColor(attempt.response.status) }]}>
                          {attempt.response.status}
                        </Text>
                      )}
                    </View>

                    {attempt.response?.data && (
                      <View style={styles.attemptContent}>
                        <View style={styles.attemptRow}>
                          <Text style={styles.attemptLabel}>Response:</Text>
                          <TouchableOpacity
                            style={styles.miniCopyButton}
                            onPress={() => copyToClipboard(JSON.stringify(attempt.response.data, null, 2))}
                          >
                            <Text style={styles.miniCopyText}>📋</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.attemptJsonScroll} nestedScrollEnabled>
                          <Text style={styles.attemptJsonText} selectable>
                            {JSON.stringify(attempt.response.data, null, 2)}
                          </Text>
                        </ScrollView>
                      </View>
                    )}

                    {attempt.error && (
                      <View style={styles.attemptContent}>
                        <Text style={[styles.attemptLabel, { color: '#EF4444' }]}>
                          Error: {attempt.error.message}
                        </Text>
                        {attempt.error.response?.data && (
                          <ScrollView style={styles.attemptJsonScroll} nestedScrollEnabled>
                            <Text style={[styles.attemptJsonText, { color: '#EF4444' }]} selectable>
                              {JSON.stringify(attempt.error.response.data, null, 2)}
                            </Text>
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Legacy Retry Info (for requests without detailed attempts) */}
            {log.retries > 0 && (!log.attempts || log.attempts.length === 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Retry Information</Text>
                <Text style={styles.detailValue}>
                  This request was retried {log.retries} time(s) before {log.error ? 'failing' : 'succeeding'}.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return '#10B981';
      case 'POST': return '#3B82F6';
      case 'PUT': return '#F59E0B';
      case 'DELETE': return '#EF4444';
      case 'PATCH': return '#8B5CF6';
      default: return COLORS.purple2;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgColor} />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>API Logger</Text>
          <View style={styles.headerRight}>
            <Switch
              value={isEnabled}
              onValueChange={toggleLogger}
              trackColor={{ false: '#767577', true: COLORS.purple1 }}
              thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.controls}>
          <Text style={styles.controlsLabel}>
            {isEnabled ? `Logging Enabled (${logs.length} requests)` : 'Logging Disabled'}
          </Text>
          {logs.length > 0 && (
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.logsList} contentContainerStyle={styles.logsListContent}>
          {!isEnabled && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Enable logging to see API requests</Text>
            </View>
          )}
          {isEnabled && logs.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No API requests logged yet</Text>
              <Text style={styles.emptySubtext}>Make some API calls to see them here</Text>
            </View>
          )}
          {isEnabled && logs.map((log, index) => renderLog(log, index))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple0,
  },
  backButton: {
    padding: SIZES.spacingS,
  },
  backText: {
    fontSize: 16,
    color: COLORS.purple1,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.purple2,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple0,
  },
  controlsLabel: {
    fontSize: 14,
    color: COLORS.purple2,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius8,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    padding: SIZES.spacingM,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.purple2,
    fontWeight: '600',
    marginBottom: SIZES.spacingS,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textColor,
  },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    padding: SIZES.spacingM,
    marginBottom: SIZES.spacingM,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingS,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacingS,
  },
  method: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: SIZES.spacingS,
    minWidth: 50,
  },
  endpoint: {
    fontSize: 13,
    color: COLORS.purple2,
    flex: 1,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  retries: {
    fontSize: 12,
    color: '#F59E0B',
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textColor,
    marginTop: 4,
  },
  expandedContent: {
    marginTop: SIZES.spacingM,
    paddingTop: SIZES.spacingM,
    borderTopWidth: 1,
    borderTopColor: COLORS.purple0,
  },
  section: {
    marginBottom: SIZES.spacingM,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingS,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingS,
  },
  copyButton: {
    backgroundColor: COLORS.purple1,
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: 4,
    borderRadius: SIZES.cornerRadius8,
  },
  copyButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  codeBlock: {
    backgroundColor: '#1E293B',
    padding: SIZES.spacingM,
    borderRadius: SIZES.cornerRadius8,
    maxHeight: 200,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  detailRow: {
    marginBottom: SIZES.spacingS,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple2,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.textColor,
    fontFamily: 'monospace',
  },
  jsonScroll: {
    backgroundColor: '#F8FAFC',
    padding: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius8,
    maxHeight: 300,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.purple2,
    lineHeight: 16,
  },
  attemptCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: SIZES.cornerRadius8,
    padding: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple1,
  },
  attemptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingS,
  },
  attemptNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.purple1,
  },
  attemptDuration: {
    fontSize: 12,
    color: COLORS.textColor,
    fontWeight: '600',
  },
  attemptStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  attemptContent: {
    marginTop: SIZES.spacingS,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attemptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  miniCopyButton: {
    padding: 4,
  },
  miniCopyText: {
    fontSize: 14,
  },
  attemptJsonScroll: {
    backgroundColor: COLORS.white,
    padding: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius8,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attemptJsonText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.purple2,
    lineHeight: 14,
  },
});
