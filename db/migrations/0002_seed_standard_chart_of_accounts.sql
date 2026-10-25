-- Standard chart of accounts required by the accounting journal workflows.
INSERT INTO public.accounts (code, name, type, normal_balance)
SELECT v.code, v.name, v.type::account_type, v.normal_balance::normal_balance
FROM (VALUES
  ('1101', 'Kas dan bank', 'asset', 'debit'),
  ('1201', 'Piutang usaha', 'asset', 'debit'),
  ('1301', 'Persediaan barang', 'asset', 'debit'),
  ('1501', 'PPN masukan', 'asset', 'debit'),
  ('2101', 'Hutang supplier', 'liability', 'credit'),
  ('2201', 'PPN keluaran', 'liability', 'credit'),
  ('3101', 'Modal pemilik', 'equity', 'credit'),
  ('4101', 'Pendapatan penjualan', 'revenue', 'credit'),
  ('5101', 'Harga pokok penjualan', 'expense', 'debit')
) AS v(code, name, type, normal_balance)
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.code = v.code);
