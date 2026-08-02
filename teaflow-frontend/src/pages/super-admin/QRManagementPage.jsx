import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShops } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import { getFrontendUrl } from '../../services/api';

export default function QRManagementPage() {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [qrShop, setQrShop] = useState(null);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await getShops();
      setShops(res.data.data);
    } catch (err) {
      showToast('Failed to fetch shops', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const filteredShops = shops.filter((s) =>
    s.shop_name?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadQR = async (url, shopName, format) => {
    try {
      const qrDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' + encodeURIComponent(url);
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = shopName.replace(/\s+/g, '_') + '_QR.' + format;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('QR Code download started', 'success');
    } catch (e) {
      showToast('Failed to download QR code', 'error');
    }
  };

  const printPDF = (url, shopName) => {
    const printWindow = window.open('', '_blank');
    const qrDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);
    printWindow.document.write(
      '<html><head><title>' + shopName + ' - Print QR</title>' +
      '<style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#3E2723;background:#FDFBFA}' +
      '.card{border:2px solid #D7CCC8;padding:30px;border-radius:20px;max-width:400px;margin:0 auto;background:white;box-shadow:0 8px 16px rgba(0,0,0,0.05)}' +
      'h1{font-size:26px;font-weight:700;color:#3E2723;margin-bottom:5px}' +
      'p{font-size:15px;color:#6d6d6d;margin-bottom:25px}' +
      'img{margin-bottom:20px;border:2px solid #EFEBE9;padding:10px;border-radius:12px;background:white}' +
      '.footer{font-size:12px;color:#a0a0a0;margin-top:20px;font-weight:500;text-transform:uppercase;letter-spacing:1px}' +
      '</style></head><body><div class="card"><h1>' + shopName + '</h1>' +
      '<p>Scan to Browse Menu & Order</p>' +
      '<img src="' + qrDataUrl + '" width="250" height="250" />' +
      '<div class="footer">Powered by Order Manager</div></div>' +
      '<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>' +
      '</body></html>'
    );
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search shops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.length === 0 ? (
            <p className="text-slate-500 text-center py-12 col-span-full">No shops found</p>
          ) : (
            filteredShops.map((shop, i) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center"
              >
                <div className="bg-white rounded-xl p-3 inline-block mb-4">
                  <img
                    src={'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(shop.customer_url || (getFrontendUrl() + '/customer?shop=' + (shop.id || shop._id)))}
                    alt={shop.shop_name + ' QR'}
                    className="w-32 h-32"
                  />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{shop.shop_name}</h3>
                <p className="text-xs text-slate-400 mb-4 truncate">{shop.customer_url || 'No URL'}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setQrShop(shop); setShowModal(true); }}
                    className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-2 rounded-lg text-xs font-medium transition"
                  >
                    View QR
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadQR(getFrontendUrl() + '/customer?shop=' + (shop.id || shop._id), shop.shop_name, 'png')}
                      className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-medium transition"
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => printPDF(getFrontendUrl() + '/customer?shop=' + (shop.id || shop._id), shop.shop_name)}
                      className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 py-2 rounded-lg text-xs font-medium transition"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && qrShop && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-lg">QR Code Preview</h3>
                <button onClick={() => { setShowModal(false); setQrShop(null); }} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="bg-white rounded-2xl p-6 mb-6 flex justify-center">
                <img
                  src={'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(getFrontendUrl() + '/customer?shop=' + (qrShop.id || qrShop._id))}
                  alt={qrShop.shop_name + ' QR'}
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{qrShop.shop_name}</p>
              <p className="text-xs text-slate-400 mb-6 break-all">{getFrontendUrl() + '/customer?shop=' + (qrShop.id || qrShop._id)}</p>
              <div className="space-y-3">
                <button
                  onClick={() => downloadQR(getFrontendUrl() + '/customer?shop=' + (qrShop.id || qrShop._id), qrShop.shop_name, 'png')}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold transition"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => printPDF(getFrontendUrl() + '/customer?shop=' + (qrShop.id || qrShop._id), qrShop.shop_name)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold transition"
                >
                  Print / Download PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}