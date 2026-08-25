import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Layout from "../components/Layout";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl2 border border-ink/10 p-4">
      <div className="text-xs text-ink/50 mb-1">{label}</div>
      <div className={`font-display font-800 text-2xl ${accent || ""}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) return <Layout><div className="text-ink/40">Loading dashboard...</div></Layout>;

  return (
    <Layout>
      <h1 className="font-display font-800 text-xl mb-5">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue (30 days)" value={`₹${Number(data.revenueLast30Days).toFixed(0)}`} accent="text-leaf" />
        <StatCard label="Total orders" value={data.totalOrders} />
        <StatCard label="Orders in progress" value={data.pendingOrders} accent="text-mango" />
        <StatCard label="Customers" value={data.totalCustomers} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl2 border border-ink/10 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-sm">Recent orders</h2>
            <Link to="/orders" className="text-xs text-leaf font-medium">View all →</Link>
          </div>
          <div className="space-y-2">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="flex justify-between text-sm">
                <span>{o.orderNumber} · {o.user?.name || o.user?.phone}</span>
                <span className="font-medium">₹{Number(o.total).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl2 border border-ink/10 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-sm">Low stock alerts</h2>
            <Link to="/products" className="text-xs text-leaf font-medium">Manage →</Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-ink/40">Nothing low on stock right now.</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-mango font-medium">{p.stockQty} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
