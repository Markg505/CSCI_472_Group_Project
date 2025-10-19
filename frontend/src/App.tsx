import { Outlet } from "react-router-dom";
import NavBar from "./components/NavBar";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/10">
        <div className="container-xl py-10 text-sm text-mute">
          © {new Date().getFullYear()} RBOS
        </div>
      </footer>
    </div>
  );
}
