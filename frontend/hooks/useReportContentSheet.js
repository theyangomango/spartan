import { useCallback, useMemo, useState } from 'react';
import ReportContentSheet from '../components/common/ReportContentSheet';

export default function useReportContentSheet(options = {}) {
  const { onSubmit } = options;
  const [context, setContext] = useState(null);
  const [visible, setVisible] = useState(false);

  const closeReportSheet = useCallback(() => {
    setVisible(false);
  }, []);

  const openReportSheet = useCallback((nextContext = {}) => {
    setContext(nextContext || {});
    setVisible(true);
  }, []);

  const sheetNode = useMemo(() => (
    <ReportContentSheet
      key="report-content-sheet"
      visible={visible}
      context={context || {}}
      onClose={closeReportSheet}
      onSubmit={onSubmit}
    />
  ), [closeReportSheet, context, onSubmit, visible]);

  return {
    openReportSheet,
    closeReportSheet,
    reportSheetNode: sheetNode,
    isReportSheetVisible: visible,
  };
}
