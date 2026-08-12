function Navbar({ active, setActive }) {
  const tabs = [
    { id: 1, label: "Review Analysis" },
    { id: 2, label: "Reviewer Profile" },
    { id: 3, label: "Fraud Rings" },
    { id: 4, label: "Cost Calculator" },
  ]

  return (
    <nav className="sticky top-0 z-10 backdrop-blur-md bg-[#10161d]/85 border-b border-[#232f3d] px-6 py-3.5 flex items-center gap-8">
      <span className="font-display font-semibold text-[15px] whitespace-nowrap flex items-center gap-2 text-[#e7edf3]">
        <span className="w-2 h-2 rounded-full bg-[#33d9c4] shadow-[0_0_8px_2px_rgba(51,217,196,.6)]" />
        Fraud Detection System
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              active === tab.id
                ? "bg-[#1b8f80]/25 text-[#5be8d5] border border-[#33d9c4]/40"
                : "text-[#93a3b5] border border-transparent hover:text-[#e7edf3] hover:bg-white/[0.03]"
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