import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const HEADER_BG = '1E293B';   // slate-900
const HEADER_FG = 'FFFFFF';
const INCOME_BG = 'DCFCE7';   // green-100
const EXPENSE_BG = 'FEE2E2';  // red-100
const SUMMARY_BG = 'EFF6FF';  // blue-50
const ALT_ROW_BG = 'F8FAFC';  // slate-50

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: HEADER_BG } },
    };
  });
  row.height = 22;
}

function styleDataRow(row, bgColor) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle' };
    cell.font = { size: 10 };
  });
  row.height = 18;
}

function addTransactionSheet(wb, sheetName, transactions, rowBg) {
  const ws = wb.addWorksheet(sheetName);

  ws.columns = [
    { header: 'Date',            key: 'date',           width: 14 },
    { header: 'Title',           key: 'title',          width: 28 },
    { header: 'Category',        key: 'category',       width: 18 },
    { header: 'Budget Category', key: 'budgetCategory', width: 24 },
    { header: 'Type',            key: 'type',           width: 10 },
    { header: 'Amount (₹)',      key: 'amount',         width: 14 },
    { header: 'Description',     key: 'description',    width: 30 },
  ];

  styleHeader(ws.getRow(1));

  if (transactions.length === 0) {
    const row = ws.addRow({ date: 'No transactions for this period' });
    row.getCell(1).font = { italic: true, color: { argb: '94A3B8' } };
    return;
  }

  transactions.forEach((t, i) => {
    const row = ws.addRow({
      date: t.date,
      title: t.title,
      category: t.category,
      budgetCategory: t.budgetCategory,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description || '',
    });
    const isCredit = t.type === 'CREDIT';
    styleDataRow(row, i % 2 === 0 ? rowBg : ALT_ROW_BG);
    // Amount cell formatting
    row.getCell('amount').numFmt = '₹#,##0.00';
    row.getCell('amount').font = { bold: true, size: 10, color: { argb: isCredit ? '16A34A' : 'DC2626' } };
  });

  // Total row
  const totalRow = ws.addRow({
    title: 'TOTAL',
    amount: transactions.reduce((s, t) => s + parseFloat(t.amount), 0),
  });
  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11 };
  });
  totalRow.getCell('amount').numFmt = '₹#,##0.00';
  totalRow.height = 20;
}

function addSummarySheet(wb, transactions, label) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ header: 'Metric', key: 'metric', width: 28 }, { header: 'Value', key: 'value', width: 20 }];

  styleHeader(ws.getRow(1));

  const income = transactions.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0);
  const expenses = transactions.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(2) : '0.00';

  const rows = [
    { metric: 'Period', value: label, bg: 'DBEAFE' },
    { metric: '', value: '', bg: 'FFFFFF' },
    { metric: 'Total Income', value: income, bg: INCOME_BG, numFmt: true, color: '16A34A' },
    { metric: 'Total Expenses', value: expenses, bg: EXPENSE_BG, numFmt: true, color: 'DC2626' },
    { metric: 'Net Balance', value: net, bg: SUMMARY_BG, numFmt: true, color: net >= 0 ? '16A34A' : 'DC2626' },
    { metric: 'Savings Rate', value: `${savingsRate}%`, bg: SUMMARY_BG },
    { metric: '', value: '', bg: 'FFFFFF' },
    { metric: 'Total Transactions', value: transactions.length, bg: ALT_ROW_BG },
    { metric: 'Income Transactions', value: transactions.filter((t) => t.type === 'CREDIT').length, bg: INCOME_BG },
    { metric: 'Expense Transactions', value: transactions.filter((t) => t.type === 'DEBIT').length, bg: EXPENSE_BG },
  ];

  rows.forEach(({ metric, value, bg, numFmt, color }) => {
    const row = ws.addRow({ metric, value });
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { size: 11 };
      cell.alignment = { vertical: 'middle' };
    });
    row.getCell('metric').font = { bold: true, size: 11 };
    if (numFmt) {
      row.getCell('value').numFmt = '₹#,##0.00';
      row.getCell('value').font = { bold: true, size: 11, color: { argb: color } };
    }
    row.height = 20;
  });
}

export async function exportToXlsx({ transactions, filterType, month, year, date }) {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let label = '';
  if (filterType === 'daily') label = `Daily - ${date}`;
  else if (filterType === 'monthly') label = `${MONTHS[month]} ${year}`;
  else if (filterType === 'yearly') label = `Year ${year}`;
  else label = 'All Time';

  const fileLabel = label.replace(/\s+/g, '_').replace(/-/g, '').replace(/\//g, '');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FinApp';
  wb.created = new Date();

  addTransactionSheet(wb, 'Income', transactions.filter((t) => t.type === 'CREDIT'), INCOME_BG);
  addTransactionSheet(wb, 'Expenses', transactions.filter((t) => t.type === 'DEBIT'), EXPENSE_BG);
  addTransactionSheet(wb, 'All Transactions', transactions, ALT_ROW_BG);
  addSummarySheet(wb, transactions, label);

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `FinApp_${fileLabel}.xlsx`);
}
