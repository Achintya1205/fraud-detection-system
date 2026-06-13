import { useState } from "react"
import Navbar  from "./components/Navbar"
import Screen1 from "./pages/Screen1"
import Screen2 from "./pages/Screen2"
import Screen3 from "./pages/Screen3"
import Screen4 from "./pages/Screen4"

function App() {
  const [active, setActive] = useState(1)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar active={active} setActive={setActive} />
      <main>
        {active === 1 && <Screen1 />}
        {active === 2 && <Screen2 />}
        {active === 3 && <Screen3 />}
        {active === 4 && <Screen4 />}
      </main>
    </div>
  )
}

export default App