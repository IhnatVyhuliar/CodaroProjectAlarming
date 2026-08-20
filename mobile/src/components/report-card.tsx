import { StyleSheet, View } from 'react-native';

import type { ReportSummary } from '@/api/types';
import { SiteInfo } from '@/components/site-info';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { urgencyLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { formatRelative } from '@/utils/format';

export interface ReportCardProps {
  report: ReportSummary;
  onPress?: () => void;
  /** Shows the client row — dispatch views only. */
  showClient?: boolean;
  footer?: React.ReactNode;
  testID?: string;
}

export function ReportCard({
  report,
  onPress,
  showClient = false,
  footer,
  testID,
}: ReportCardProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Zgłoszenie ${report.name}`}
      testID={testID ?? `report-card-${report.id}`}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.title}>
          {report.name}
        </ThemedText>
        <StatusBadge status={report.status} />
      </View>

      <SiteInfo
        isEntrapment={report.is_entrapment}
        siteAddress={report.site_address}
        deviceLabel={report.device_label}
        compact
        testID={`report-site-${report.id}`}
      />

      <ThemedText type="small" themeColor="textSecondary">
        {report.category?.name ?? 'Bez kategorii'} · Pilność: {urgencyLabels[report.urgency]} ·{' '}
        {formatRelative(report.created_at)}
      </ThemedText>

      {showClient && report.client !== null ? (
        <ThemedText type="small">Klient: {report.client.name}</ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Zadania: {report.open_requests_count}/{report.requests_count} otwartych · Przydziały:{' '}
        {report.active_assignments_count}
      </ThemedText>

      {report.handled_by_admin_only ? (
        <ThemedText type="small">Realizowane wyłącznie przez administratora</ThemedText>
      ) : null}

      {report.has_live_stream ? (
        <ThemedText type="small" themeColor="warning">
          Trwa transmisja
        </ThemedText>
      ) : null}

      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
});
