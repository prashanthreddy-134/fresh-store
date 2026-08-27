import { useEffect, useState } from "react";
import { api } from "../api/client";
import Layout from "../components/Layout";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  function load() {
    api
      .get("/admin/customers", {
        params: q ? { q } : {},
      })
      .then((res) => setCustomers(res.data.customers))
      .catch((err) => {
        console.error("Could not load customers:", err);
      });
  }

  useEffect(() => {
    load();
  }, [q]);

  async function toggleActive(c) {
    try {
      await api.patch(`/admin/customers/${c.id}/status`, {
        isActive: !c.isActive,
      });

      load();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not update customer status."
      );
    }
  }

  async function deleteCustomer(c) {
    const confirmed = window.confirm(
      `Delete customer "${c.name || c.phone}"?\n\n` +
        "This will permanently remove this customer account " +
        "and their testing data. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(c.id);

      await api.delete(`/admin/customers/${c.id}`);

      alert("Customer deleted successfully.");

      load();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not delete customer."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display font-800 text-xl">
          Customers
        </h1>

        <input
          placeholder="Search by name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-sm border border-ink/15 rounded-full px-4 py-1.5 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl2 border border-ink/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-ink/50">
            <tr>
              <th className="px-4 py-2">
                Name
              </th>

              <th className="px-4 py-2">
                Phone
              </th>

              <th className="px-4 py-2">
                Orders
              </th>

              <th className="px-4 py-2">
                Joined
              </th>

              <th className="px-4 py-2">
                Status
              </th>

              <th className="px-4 py-2">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-t border-ink/5"
              >
                <td className="px-4 py-2 font-medium">
                  {c.name || "—"}
                </td>

                <td className="px-4 py-2">
                  {c.phone}
                </td>

                <td className="px-4 py-2">
                  {c._count.orders}
                </td>

                <td className="px-4 py-2 text-ink/50">
                  {new Date(
                    c.createdAt
                  ).toLocaleDateString()}
                </td>

                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.isActive
                        ? "bg-leaf-light text-leaf"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {c.isActive
                      ? "Active"
                      : "Disabled"}
                  </span>
                </td>

                <td className="px-4 py-2">
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className="text-xs font-medium text-ink/60 hover:text-ink"
                    >
                      {c.isActive
                        ? "Disable"
                        : "Enable"}
                    </button>

                    <button
                      onClick={() => deleteCustomer(c)}
                      disabled={deletingId === c.id}
                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === c.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {customers.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-4 py-8 text-center text-ink/50"
                >
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}