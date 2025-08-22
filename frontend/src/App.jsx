import React, { useState } from "react";
import { ProfilesProvider, useProfiles } from "./context/ProfilesContext";
import Tabs from "./components/Tabs";
import Toast from "./components/Toast";
import ProfilePage from "./pages/ProfilePage";
import GeneratePage from "./pages/GeneratePage";
import "./App.css";

function Shell() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useProfiles();

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f6f6f6" }}>
      <Toast toast={toast} />
      <Tabs active={activeTab} onChange={setActiveTab} />
      {activeTab === "profile" ? <ProfilePage /> : <GeneratePage />}
    </div>
  );
}

export default function App() {
  return (
    <ProfilesProvider>
      <Shell />
    </ProfilesProvider>
  );
}
