import React from "react";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  // Redirect to the Reader Dashboard (Discover page)
  return <Navigate to="/discover" replace />;
}
