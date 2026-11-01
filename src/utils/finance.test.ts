import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIDR,
  parseNominalInput,
  calculateExpectedClosingBalance,
  calculateCashDifference,
  calculateCustomerChange,
  calculateCategoryBreakdown,
  summarizeTransactions,
  buildChartSeries,
  formatWhatsAppClosingReport,
} from './finance';
import { Transaction } from '../types/kas';

test('formatIDR formats positive and negative Rupiah values accurately', () => {
  assert.equal(formatIDR(15000), 'Rp 15.000');
  assert.equal(formatIDR(250000), 'Rp 250.000');
  assert.equal(formatIDR(-20000), '-Rp 20.000');
  assert.equal(formatIDR(50000, false), '50.000');
});

test('parseNominalInput strips non-digit characters cleanly', () => {
  assert.equal(parseNominalInput('Rp 20.000'), 20000);
  assert.equal(parseNominalInput('150.500'), 150500);
  assert.equal(parseNominalInput('abc'), 0);
});

test('calculateExpectedClosingBalance computes opening + income - expense', () => {
  const expected = calculateExpectedClosingBalance(200000, 850000, 175000);
  assert.equal(expected, 875000);
});

test('calculateCustomerChange computes customer change and sufficiency', () => {
  const res1 = calculateCustomerChange(35000, 50000);
  assert.equal(res1.change, 15000);
  assert.equal(res1.isSufficient, true);

  const res2 = calculateCustomerChange(50000, 20000);
  assert.equal(res2.change, -30000);
  assert.equal(res2.isSufficient, false);
});

test('calculateCashDifference detects MATCH, SURPLUS, and DEFICIT', () => {
  const match = calculateCashDifference(500000, 500000);
  assert.equal(match.status, 'MATCH');
  assert.equal(match.difference, 0);

  const surplus = calculateCashDifference(500000, 515000);
  assert.equal(surplus.status, 'SURPLUS');
  assert.equal(surplus.difference, 15000);

  const deficit = calculateCashDifference(500000, 480000);
  assert.equal(deficit.status, 'DEFICIT');
  assert.equal(deficit.difference, -20000);
});

test('summarizeTransactions and calculateCategoryBreakdown aggregate accurately', () => {
  const sample: Transaction[] = [
    {
      id: '1',
      amount: 35000,
      type: 'INCOME',
      category_id: 'cat-1',
      category_name: 'Penjualan Mie Ayam & Menu',
      description: '2 Porsi Mie Ayam Bakso',
      date: '2026-11-01T10:00:00.000Z',
      created_at: '2026-11-01T10:00:00.000Z',
    },
    {
      id: '2',
      amount: 20000,
      type: 'INCOME',
      category_id: 'cat-1',
      category_name: 'Penjualan Mie Ayam & Menu',
      description: '1 Porsi Mie Ayam Komplit',
      date: '2026-11-01T11:00:00.000Z',
      created_at: '2026-11-01T11:00:00.000Z',
    },
    {
      id: '3',
      amount: 15000,
      type: 'EXPENSE',
      category_id: 'cat-2',
      category_name: 'Operasional',
      description: 'Es Batu Kristal',
      date: '2026-11-01T12:00:00.000Z',
      created_at: '2026-11-01T12:00:00.000Z',
    },
    {
      id: '4',
      amount: 45000,
      type: 'EXPENSE',
      category_id: 'cat-3',
      category_name: 'Bahan Baku',
      description: 'Sawi & Ayam',
      date: '2026-11-01T12:30:00.000Z',
      created_at: '2026-11-01T12:30:00.000Z',
    },
  ];

  const summary = summarizeTransactions(sample);
  assert.equal(summary.totalIncome, 55000);
  assert.equal(summary.totalExpense, 60000);
  assert.equal(summary.netProfit, -5000);

  const expenseBreakdown = calculateCategoryBreakdown(sample, 'EXPENSE');
  assert.equal(expenseBreakdown.length, 2);
  assert.equal(expenseBreakdown[0].category_name, 'Bahan Baku');
  assert.equal(expenseBreakdown[0].percentage, 75);
  assert.equal(expenseBreakdown[1].category_name, 'Operasional');
  assert.equal(expenseBreakdown[1].percentage, 25);
});

test('buildChartSeries creates exact day buckets and aggregates transactions', () => {
  const refDate = new Date('2026-11-01T12:00:00');
  const sample: Transaction[] = [
    {
      id: '1',
      amount: 120000,
      type: 'INCOME',
      category_id: 'cat-1',
      description: 'Penjualan Siang',
      date: refDate.toISOString(),
      created_at: refDate.toISOString(),
    },
    {
      id: '2',
      amount: 45000,
      type: 'EXPENSE',
      category_id: 'cat-2',
      description: 'Beli Sawi & Daun Bawang',
      date: refDate.toISOString(),
      created_at: refDate.toISOString(),
    },
  ];

  const series7 = buildChartSeries(sample, 7, refDate);
  assert.equal(series7.length, 7);
  const lastDay = series7[series7.length - 1];
  assert.equal(lastDay.income, 120000);
  assert.equal(lastDay.expense, 45000);
  assert.equal(lastDay.net, 75000);
});

test('formatWhatsAppClosingReport generates complete summary text', () => {
  const report = formatWhatsAppClosingReport({
    dateLabel: '01 Nov',
    openingBalance: 200000,
    totalIncome: 500000,
    incomeCount: 25,
    totalExpense: 150000,
    expenseCount: 3,
    expectedClosing: 550000,
    actualClosing: 550000,
    notes: 'Setor tunai ke Mba Anna',
  });
  assert.ok(report.includes('LAPORAN TUTUP BUKU - MIE AYAM MBA ANNA'));
  assert.ok(report.includes('Rp 550.000'));
  assert.ok(report.includes('Klop / Sesuai Estimasi'));
});
