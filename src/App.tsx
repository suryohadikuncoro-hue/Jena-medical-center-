import { Routes, Route } from 'react-router'
import AppShell from './components/AppShell'
import Beranda from './pages/Beranda'
import Pesanan from './pages/Pesanan'
import PesananBaru from './pages/PesananBaru'
import PesananDetail from './pages/PesananDetail'
import InvoiceList from './pages/InvoiceList'
import InvoiceDetail from './pages/InvoiceDetail'
import Pembayaran from './pages/Pembayaran'
import Faktur from './pages/Faktur'
import Laporan from './pages/Laporan'
import Lainnya from './pages/Lainnya'
import Pelanggan from './pages/Pelanggan'
import Supplier from './pages/Supplier'
import Barang from './pages/Barang'

function NotFound() {
  return (
    <div className="px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <a href="/" className="btn mt-6 inline-flex">Kembali ke Beranda</a>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Beranda />} />
        <Route path="/pesanan" element={<Pesanan />} />
        <Route path="/pesanan/baru" element={<PesananBaru />} />
        <Route path="/pesanan/:id" element={<PesananDetail />} />
        <Route path="/invoice" element={<InvoiceList />} />
        <Route path="/invoice/:id" element={<InvoiceDetail />} />
        <Route path="/pembayaran" element={<Pembayaran />} />
        <Route path="/faktur" element={<Faktur />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/lainnya" element={<Lainnya />} />
        <Route path="/pelanggan" element={<Pelanggan />} />
        <Route path="/supplier" element={<Supplier />} />
        <Route path="/barang" element={<Barang />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
