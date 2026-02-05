import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    TrendingUp,
    Users,
    AlertCircle,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    CreditCard,
    ExternalLink,
    ChevronDown,
    RefreshCw,
    Mail,
    Smartphone,
    Calendar,
    Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { secureFetch } from '@/services/apiService';
import Config from '@/services/configService';
import { getCurrentUser } from '@/services/googleAuthService';

interface Transaction {
    id: string;
    transaction_id: string;
    device_id: string;
    google_uid: string;
    product_id: string;
    status: 'success' | 'failed' | 'pending';
    error_message?: string;
    amount: number;
    currency: string;
    verified_at: string;
    user_accounts?: {
        name: string;
        email: string;
    };
}

interface Stats {
    totalRevenue: number;
    userCount: number;
    failedCount: number;
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'all' | 'success' | 'failed' | 'pending'>('all');
    const [grantingId, setGrantingId] = React.useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, transRes] = await Promise.all([
                secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                    method: 'POST',
                    body: JSON.stringify({ type: 'admin_get_stats' })
                }),
                secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                    method: 'POST',
                    body: JSON.stringify({ type: 'admin_fetch_payments' })
                })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (transRes.ok) setTransactions(await transRes.json());
        } catch (err) {
            console.error('Admin Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const checkAccess = async () => {
            const user = await getCurrentUser();
            console.log('🔍 Admin Access Check:', {
                user: user ? { uid: user.google_uid, email: user.email } : null,
                allowedUIDs: Config.VITE_ADMIN_UIDS,
                hasAccess: user && Config.VITE_ADMIN_UIDS.includes(user.google_uid)
            });
            if (!user || !Config.VITE_ADMIN_UIDS.includes(user.google_uid)) {
                console.warn('🛡️ Security: Unauthorized dashboard access attempt.', {
                    reason: !user ? 'Not logged in' : 'UID not in VITE_ADMIN_UIDS'
                });
                navigate('/workspace');
                return;
            }
            fetchData();
        };
        checkAccess();
    }, [navigate]);

    const handleManualGrant = async (transaction: Transaction) => {
        if (!window.confirm(`Grant Lifetime Access to ${transaction.user_accounts?.email || transaction.device_id}?`)) return;

        setGrantingId(transaction.id);
        try {
            const res = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'admin_grant_access',
                    targetUid: transaction.google_uid,
                    targetDeviceId: transaction.device_id,
                    targetTier: 'lifetime'
                })
            });

            if (res.ok) {
                alert('Access granted successfully!');
                fetchData();
            } else {
                alert('Failed to grant access.');
            }
        } catch (err) {
            console.error('Grant Error:', err);
        } finally {
            setGrantingId(null);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            t.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.user_accounts?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.device_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = statusFilter === 'all' || t.status === statusFilter;

        return matchesSearch && matchesFilter;
    });

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                    <Shield size={48} className="text-[#00C896] opacity-50" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-8 pt-24 font-sans text-black dark:text-white">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Shield className="text-[#00C896]" size={28} />
                            <h1 className="text-3xl font-black uppercase tracking-tighter">Command Center</h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Payment Protocol Dashboard</p>
                    </div>

                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-6 py-3 bg-[#00C896]/10 text-[#00C896] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00C896]/20 transition-all active:scale-95"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Data
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Estimated Revenue', value: `$${stats?.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-[#00C896]', bg: 'bg-[#00C896]/10' },
                        { label: 'Total Protocols', value: stats?.userCount || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'System Deflections', value: stats?.failedCount || 0, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[32px] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/40 backdrop-blur-xl space-y-4"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                                <h2 className="text-4xl font-black tracking-tighter mt-1">{stat.value}</h2>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#00C896] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH PROTOCOL, EMAIL, OR TRANSACTION..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[#00C896]/30 rounded-[28px] py-4 pl-16 pr-8 text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-500"
                        />
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="appearance-none bg-black/5 dark:bg-white/5 border border-transparent focus:border-[#00C896]/30 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                            <option value="all">ALL STATUS</option>
                            <option value="success">SUCCESS ONLY</option>
                            <option value="failed">FAILED ONLY</option>
                            <option value="pending">PENDING ONLY</option>
                        </select>
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="rounded-[40px] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/2">
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500">Identity</th>
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500">Transaction</th>
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500">Amount</th>
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500">Verified At</th>
                                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                <AnimatePresence>
                                    {filteredTransactions.map((tx) => (
                                        <motion.tr
                                            key={tx.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors group"
                                        >
                                            <td className="p-6">
                                                <div className="space-y-1">
                                                    <p className="text-[11px] font-black uppercase tracking-tight truncate max-w-[200px]">
                                                        {tx.user_accounts?.name || 'Anonymous User'}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5 lowercase">
                                                        <Mail size={10} />
                                                        {tx.user_accounts?.email || 'No email associated'}
                                                    </p>
                                                    <p className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                                                        <Smartphone size={10} />
                                                        {tx.device_id.substring(0, 12)}...
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-1 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                    <p className="text-[10px] font-mono font-black tracking-widest">{tx.transaction_id || 'LOCAL_GRANT'}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">{tx.product_id.replace(/_/g, ' ')}</p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tx.status === 'success'
                                                    ? 'bg-[#00C896]/10 text-[#00C896]'
                                                    : tx.status === 'failed'
                                                        ? 'bg-red-500/10 text-red-500'
                                                        : 'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {tx.status === 'success' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                    {tx.status}
                                                </div>
                                                {tx.error_message && (
                                                    <p className="text-[9px] text-red-500 mt-1.5 max-w-[200px] leading-tight font-bold italic">
                                                        {tx.error_message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={12} className="text-gray-400" />
                                                    <span className="text-[11px] font-black">${tx.amount.toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Calendar size={12} />
                                                    <span className="text-[10px] font-bold uppercase">{new Date(tx.verified_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {tx.status !== 'success' && (
                                                        <button
                                                            disabled={grantingId === tx.id}
                                                            onClick={() => handleManualGrant(tx)}
                                                            className="px-4 py-2 bg-[#00C896] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-[#00C896]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {grantingId === tx.id ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
                                                            GRANT
                                                        </button>
                                                    )}
                                                    <a
                                                        href={`https://play.google.com/console/u/0/developers/8752214471714314314/order-management?query=${tx.transaction_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all text-gray-500 hover:text-[#00C896]"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {filteredTransactions.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <Search size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-widest text-gray-500">Zero Deflections Found</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">No transactions match your current frequency filters.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recovery Section */}
                <div className="rounded-[40px] border border-red-500/20 bg-red-500/5 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Payment Recovery</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Force sync purchase when normal verification failed</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="PURCHASE TOKEN FROM GOOGLE PLAY..."
                            id="recovery-token"
                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/30 rounded-2xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none"
                        />
                        <input
                            type="text"
                            placeholder="TARGET GOOGLE UID..."
                            id="recovery-uid"
                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/30 rounded-2xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none"
                        />
                        <input
                            type="text"
                            placeholder="TARGET DEVICE ID..."
                            id="recovery-device"
                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/30 rounded-2xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none"
                        />
                        <input
                            type="text"
                            placeholder="TRANSACTION ID (OPTIONAL)..."
                            id="recovery-transaction"
                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/30 rounded-2xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none"
                        />
                    </div>

                    <button
                        onClick={async () => {
                            const purchaseToken = (document.getElementById('recovery-token') as HTMLInputElement)?.value;
                            const targetGoogleUid = (document.getElementById('recovery-uid') as HTMLInputElement)?.value;
                            const targetDeviceId = (document.getElementById('recovery-device') as HTMLInputElement)?.value;
                            const transactionId = (document.getElementById('recovery-transaction') as HTMLInputElement)?.value;

                            if (!purchaseToken) {
                                alert('Purchase token is required');
                                return;
                            }
                            if (!targetGoogleUid && !targetDeviceId) {
                                alert('Either Google UID or Device ID is required');
                                return;
                            }

                            if (!window.confirm(`Force sync Lifetime access?\n\nTarget: ${targetGoogleUid || targetDeviceId}\n\nThis will verify with Google Play first.`)) return;

                            try {
                                const res = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        type: 'admin_force_sync_purchase',
                                        purchaseToken,
                                        productId: 'lifetime_pro_access',
                                        targetGoogleUid: targetGoogleUid || null,
                                        targetDeviceId: targetDeviceId || null,
                                        transactionId: transactionId || `recovery_${Date.now()}`
                                    })
                                });

                                const data = await res.json();
                                if (res.ok) {
                                    alert(`Recovery successful!\n\n${JSON.stringify(data, null, 2)}`);
                                    fetchData();
                                } else {
                                    alert(`Recovery failed: ${data.error}\n\n${data.details || ''}`);
                                }
                            } catch (err: any) {
                                alert(`Recovery error: ${err.message}`);
                            }
                        }}
                        className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95"
                    >
                        Force Sync (Verifies with Google Play)
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">
                    <span>Anti-Gravity Neural Core v2.9.1</span>
                    <span>Access Restricted to Certified Admins</span>
                    <span>Latency: Low</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
