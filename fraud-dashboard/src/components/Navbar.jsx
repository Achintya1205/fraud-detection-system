function Navbar({ active, setActive }) {
  const tabs = [
    { id: 1, label: "🔍 Review Analysis" },
    { id: 2, label: "👤 Reviewer Profile" },
    { id: 3, label: "🕸️ Fraud Rings" },
    { id: 4, label: "💰 Cost Calculator" },
  ]

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center gap-8">
      <span className="font-bold text-lg whitespace-nowrap">
        Fraud Detection System
      </span>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              active === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Navbar