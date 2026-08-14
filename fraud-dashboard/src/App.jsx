import { useState } from "react"
import Navbar  from "./components/Navbar"
import Screen1 from "./pages/Screen1"
import Screen2 from "./pages/Screen2"
import Screen3 from "./pages/Screen3"
import Screen4 from "./pages/Screen4"
import Screen5 from "./pages/Screen5"
import Screen6 from "./pages/Screen6"

function App() {
  const [active, setActive] = useState(1)

  return (
    <div className="min-h-screen">
      <Navbar active={active} setActive={setActive} />
      <main>
        {active === 1 && <Screen1 />}
        {active === 2 && <Screen2 />}
        {active === 3 && <Screen3 />}
        {active === 4 && <Screen4 />}
        {active === 5 && <Screen5 />}
        {active === 6 && <Screen6 />}
      </main>
    </div>
  )
}

export default App