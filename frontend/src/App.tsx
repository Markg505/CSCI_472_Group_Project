import { Outlet } from "react-router-dom";
import NavBar from "./components/NavBar";

export default function App() {
  return (
    <>
      <NavBar />
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </>
  );
}
