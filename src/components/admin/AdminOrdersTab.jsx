import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Smartphone,
  Eye,
  Loader2,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
} from "lucide-react";

const STATUS_COLORS = {
  pending:    { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: Clock },
  paid:       { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", icon: CheckCircle2 },
  partial:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  icon: AlertCircle },
  failed:     { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   icon: XCircle },
  refunded:   { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",  icon: XCircle },
};

const ORDER_STATUS_COLORS = {
  new:         { bg: "bg-blue-50",    text: "text-blue-700",    label: "New" },
  confirmed:   { bg: "bg-indigo-50",  text: "text-indigo-700",  label: "Confirmed" },
  processing:  { bg: "bg-purple-50",  text: "text-purple-700",  label: "Processing" },
  shipped:     { bg: "bg-orange-50",  text: "text-orange-700",  label: "Shipped" },
  delivered:   { bg: "bg-green-50",   text: "text-green-700",   label: "Delivered" },
  cancelled:   { bg: "bg-red-50",     text: "text-red-700",     label: "Cancelled" },
};

const ORDER_STATUS_FLOW = ["new", "confirmed", "processing", "shipped", "delivered"];

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Order.list("-created_at", 200);
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await base44.entities.Order.update(orderId, { order_status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o)));
    } catch (err) {
      console.error("Failed to update order:", err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter !== "all") {
      if (["paid", "pending", "partial", "failed"].includes(filter)) {
        if (o.payment_status !== filter) return false;
      } else {
        if (o.order_status !== filter) return false;
      }
    }
    if (search) {
      const s = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(s) ||
        o.customer_phone?.includes(s) ||
        o.product_name?.toLowerCase().includes(s) ||
        o.mpesa_receipt_number?.includes(s) ||
        o.id?.includes(s)
      );
    }
    return true;
  });

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.payment_status === "paid").length,
    pending: orders.filter((o) => o.payment_status === "pending").length,
    partial: orders.filter((o) => o.payment_status === "partial").length,
    revenue: orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Orders", value: stats.total, color: "text-gray-900" },
          { label: "Paid", value: stats.paid, color: "text-green-600" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Partial", value: stats.partial, color: "text-blue-600" },
          { label: "Revenue", value: `KSh ${stats.revenue?.toLocaleString()}`, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "paid", label: "Paid" },
            { key: "partial", label: "Partial" },
            { key: "new", label: "New" },
            { key: "processing", label: "Processing" },
            { key: "delivered", label: "Delivered" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-200"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="h-10 rounded-xl border-gray-200" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const payConf = STATUS_COLORS[order.payment_status] || STATUS_COLORS.pending;
            const ordConf = ORDER_STATUS_COLORS[order.order_status] || ORDER_STATUS_COLORS.new;
            const PayIcon = payConf.icon;
            const isExpanded = expandedId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all ${
                  isExpanded ? "border-primary/30 shadow-lg" : "border-gray-100 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Order Row */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  {/* Product Image */}
                  {order.product_image ? (
                    <img src={order.product_image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">🛋️</div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">{order.customer_name}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 truncate">{order.product_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {order.payment_method === "mpesa" ? <Smartphone className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {order.payment_method === "mpesa" ? "M-Pesa" : "Card"}
                      </span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Amount & Badges */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">KSh {(order.amount_paid || 0)?.toLocaleString()}</p>
                      {order.balance_due > 0 && (
                        <p className="text-xs text-amber-600">Bal: KSh {order.balance_due?.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${payConf.bg} ${payConf.text} ${payConf.border} border`}>
                        <PayIcon className="w-3 h-3" />
                        {order.payment_status}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-center ${ordConf.bg} ${ordConf.text}`}>
                        {ordConf.label}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Customer Info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</h4>
                        <div className="space-y-1.5 text-sm">
                          <p className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {order.customer_phone}
                          </p>
                          {order.customer_email && (
                            <p className="flex items-center gap-2 text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-gray-400" /> {order.customer_email}
                            </p>
                          )}
                          {order.delivery_address && (
                            <p className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" /> {order.delivery_address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</h4>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Amount</span>
                            <span className="font-medium">KSh {order.total_amount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="font-medium text-green-600">KSh {(order.amount_paid || 0)?.toLocaleString()}</span>
                          </div>
                          {order.balance_due > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Balance Due</span>
                              <span className="font-medium text-amber-600">KSh {order.balance_due?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Payment Type</span>
                            <Badge variant="outline" className="capitalize text-[10px]">{order.payment_type}</Badge>
                          </div>
                          {order.mpesa_receipt_number && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">M-Pesa Receipt</span>
                              <span className="font-mono text-xs font-medium">{order.mpesa_receipt_number}</span>
                            </div>
                          )}
                          {order.stripe_payment_intent_id && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Stripe ID</span>
                              <span className="font-mono text-xs font-medium">{order.stripe_payment_intent_id.slice(0, 16)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Status Update */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Update Order Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {ORDER_STATUS_FLOW.map((status) => {
                          const conf = ORDER_STATUS_COLORS[status];
                          const isCurrent = order.order_status === status;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={isCurrent ? "default" : "outline"}
                              className={`rounded-full text-xs ${
                                isCurrent ? "bg-primary text-white" : `${conf.bg} ${conf.text} border-transparent hover:border-gray-300`
                              }`}
                              disabled={isCurrent || updating === order.id}
                              onClick={() => updateOrderStatus(order.id, status)}
                            >
                              {updating === order.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              {conf.label}
                            </Button>
                          );
                        })}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs bg-red-50 text-red-600 border-transparent hover:border-red-300"
                          disabled={order.order_status === "cancelled" || updating === order.id}
                          onClick={() => updateOrderStatus(order.id, "cancelled")}
                        >
                          Cancel Order
                        </Button>
                      </div>
                    </div>

                    {/* Order ID */}
                    <div className="mt-3 text-xs text-gray-400">
                      Order ID: <span className="font-mono">{order.id}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
