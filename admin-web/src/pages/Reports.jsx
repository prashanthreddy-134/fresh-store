import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../api/client";
import Layout from "../components/Layout";

export default function Reports() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    api.get("/admin/reports/sales", { params: { ...(from && { from }), ...(to && { to }) } }).then((res) => setData(res.data));
  }
  useEffect(load, []);

  return (
    <Layout>
      <h1 className="font-display font-800 text-xl mb-5">Sales report</h1>

      <div className="flex gap-2 mb-5 items-end">
        <div>
          <label className="text-xs text-ink/50 block mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-ink/50 block mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={load} className="bg-leaf text-cream text-sm font-semibold px-4 py-2 rounded-full">Apply</button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl2 border border-ink/10 p-4">
              <div className="text-xs text-ink/50 mb-1">Total revenue</div>
              <div className="font-display font-800 text-2xl text-leaf">₹{data.totalRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-white rounded-xl2 border border-ink/10 p-4">
              <div className="text-xs text-ink/50 mb-1">Paid orders</div>
              <div className="font-display font-800 text-2xl">{data.totalOrders}</div>
            </div>
            <div className="bg-white rounded-xl2 border border-ink/10 p-4">
              <div className="text-xs text-ink/50 mb-1">Avg. order value</div>
              <div className="font-display font-800 text-2xl">₹{data.averageOrderValue.toFixed(0)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl2 border border-ink/10 p-4">
            <h2 className="font-semibold text-sm mb-3">Daily revenue</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18241915" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#1B7A43" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Layout>
  );
}
