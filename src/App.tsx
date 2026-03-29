import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Survey from "./pages/Survey";
import PostcardPreview from "./pages/PostcardPreview";
import Database from "./pages/Database";
import PrintGuide from "./pages/PrintGuide";
import ApiDocs from "./pages/ApiDocs";
import Resources from "./pages/Resources";
import "./App.css";

function Nav() {
  const location = useLocation();
  if (location.pathname.startsWith("/s/")) return null;

  return (
    <nav className="top-nav">
      <Link to="/" className="nav-brand">
        AllClear
      </Link>
      <div className="nav-links">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Home
        </Link>
        <Link to="/postcard" className={location.pathname === "/postcard" ? "active" : ""}>
          Postcard
        </Link>
        <Link to="/database" className={location.pathname === "/database" ? "active" : ""}>
          Database
        </Link>
        <Link to="/print" className={location.pathname === "/print" ? "active" : ""}>
          Print Guide
        </Link>
        <Link to="/resources" className={location.pathname === "/resources" ? "active" : ""}>
          Resources
        </Link>
        <Link to="/api" className={location.pathname === "/api" ? "active" : ""}>
          API
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:hash" element={<Survey />} />
        <Route path="/postcard" element={<PostcardPreview />} />
        <Route path="/database" element={<Database />} />
        <Route path="/print" element={<PrintGuide />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/api" element={<ApiDocs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
