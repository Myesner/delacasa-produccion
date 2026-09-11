/** Public document identifiers only. No credentials or write endpoints. */
export const SOLO_LECTURA = import.meta.env?.VITE_DATA_SOURCE !== 'mock';
export const SHEET = {
  id: '1_h90Mq7KRvFCSsYe-hmZVq88zigzkFlCC5ksCzuHXFs',
  gid: '1004315769',
  tab: 'Produccion',
  headerRow: 6,
  refreshMs: 60_000,
};
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET.id}/edit#gid=${SHEET.gid}`;
export const SHEET_READ_URL = `https://docs.google.com/spreadsheets/d/${SHEET.id}/gviz/tq?tqx=out:csv&gid=${SHEET.gid}&range=A${SHEET.headerRow}:L&headers=1`;
