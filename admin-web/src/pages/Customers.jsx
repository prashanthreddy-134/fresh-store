import { useEffect, useState } from "react";
import { api } from "../api/client";
import Layout from "../components/Layout";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");

  function load() {
    api.get("/admin/customers", { params: q ? { q } : {} }).then((res) => setCustomers(res.data.customers));
  }

  useEffect(load, [q]);

  async function toggleActive(c) {
    await api.patch(`/admin/customers/${c.id}/status`, { isActive: !c.isActive });
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display font-800 text-xl">Customers</h1>
        <input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="text-sm border border-ink/15 rounded-full px-4 py-1.5 bg-white" />
      </div>

      <div className="bg-white rounded-xl2 border border-ink/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-ink/50">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Orders</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-ink/5">
                <td className="px-4 py-2 font-medium">{c.name || "—"}</td>
                <td className="px-4 py-2">{c.phone}</td>
                <td className="px-4 py-2">{c._count.orders}</td>
                <td className="px-4 py-2 text-ink/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? "bg-leaf-light text-leaf" : "bg-red-100 text-red-600"}`}>
                    {c.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleActive(c)} className="text-xs font-medium text-ink/60">
                    {c.isActive ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
