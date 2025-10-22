import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InviteFormTab from "./InviteFormTab.jsx";
import UserManagement from "./UserManagement";
import GuestList from "./GuestsList";
import EventSettingsTab from "./EventSettingsTab";
import SeatingArrangementTab from "./SeatingArrangementTab";
import TicketsTab from "./TicketsTab"; 
import RealTimeDashboard from "../RealTimeDashboard";

export default function EventPage() {
  const { eventId } = useParams();
  console.log('EventPage: eventId from useParams:', eventId);
  const [activeTab, setActiveTab] = useState("form");
  const role = localStorage.getItem("role");

  // Debug imported component types
  console.log('Component types:\n', {
    InviteFormTab: typeof InviteFormTab,
    InviteFormTab_default: typeof (InviteFormTab && InviteFormTab.default),
    EventSettingsTab: typeof EventSettingsTab,
    GuestList: typeof GuestList,
    UserManagement: typeof UserManagement,
    SeatingArrangementTab: typeof SeatingArrangementTab,
    TicketsTab: typeof TicketsTab,
    RealTimeDashboard: typeof RealTimeDashboard,
  });

  const renderTabContent = () => {
    console.log('EventPage: renderTabContent called with activeTab:', activeTab);
    switch (activeTab) {
      case "form": {
        const ResolvedInviteForm =
          typeof InviteFormTab === 'function'
            ? InviteFormTab
            : (InviteFormTab && typeof InviteFormTab.default === 'function'
                ? InviteFormTab.default
                : null);
        if (!ResolvedInviteForm) {
          console.error('InviteFormTab is not a valid component. Got:', InviteFormTab);
          return null;
        }
        return <ResolvedInviteForm eventId={eventId} />;
      }
      case "settings":
        console.log('EventPage: rendering EventSettingsTab with eventId:', eventId);
        return <EventSettingsTab eventId={eventId} />;
      case "guests":
        return <GuestList eventId={eventId} />;
      case "users":
        return <UserManagement eventId={eventId} />;
      case "seating":
        return <SeatingArrangementTab eventId={eventId} />;
      case "tickets":
        return <TicketsTab eventId={eventId} />;
      case "realtime":
        return <RealTimeDashboard eventId={eventId} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "30px", direction: "rtl" }}>
      <h2>ניהול אירוע</h2>
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button 
          className={`event-tabs-btn ${activeTab === "form" ? "active" : ""}`} 
          onClick={() => setActiveTab("form")}
        >
          טופס הזמנה
        </button>
        <button 
          className={`event-tabs-btn ${activeTab === "settings" ? "active" : ""}`} 
          onClick={() => setActiveTab("settings")}
        >
          הגדרות האירוע
        </button>
        <button 
          className={`event-tabs-btn ${activeTab === "guests" ? "active" : ""}`} 
          onClick={() => setActiveTab("guests")}
        >
          רשימת מוזמנים
        </button>
        {role === "admin" && (
          <button 
            className={`event-tabs-btn ${activeTab === "users" ? "active" : ""}`} 
            onClick={() => setActiveTab("users")}
          >
            ניהול משתמשים
          </button>
        )}
        <button 
          className={`event-tabs-btn ${activeTab === "seating" ? "active" : ""}`} 
          onClick={() => setActiveTab("seating")}
        >
          סידור מקומות ישיבה
        </button>
        <button 
          className={`event-tabs-btn ${activeTab === "tickets" ? "active" : ""}`} 
          onClick={() => setActiveTab("tickets")}
        >
          כרטיסים
        </button>
        <button 
          className={`event-tabs-btn realtime-btn ${activeTab === "realtime" ? "active" : ""}`} 
          onClick={() => setActiveTab("realtime")}
        >
          ⚡ זמן אמת
        </button>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
}