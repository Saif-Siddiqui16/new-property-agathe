import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

/* AUTH */
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

/* DASHBOARD */
import { Dashboard } from "./pages/Dashboard";
import { SelectProperty } from "./pages/SelectProperty";
import { VacancyDashboard } from "./pages/VacancyDashboard";
import { RevenueDashboard } from "./pages/RevenueDashboard";
import { Profile } from "./pages/Profile";

/* PROPERTIES */
import { Properties } from "./pages/Properties";
import Buildings from "./pages/Buildings";
import { Units } from "./pages/Units";
import { PropertyDetail } from "./pages/PropertyDetail";
import { UnitDetail } from "./pages/UnitDetail";
import { BedroomSetup } from "./pages/BedroomSetup";
import { RentalModeSwitch } from "./pages/RentalModeSwitch";
import UnitReadiness from "./pages/UnitReadiness";

/* TENANTS */
import { Tenants } from "./pages/Tenants";
import { InsuranceAlerts } from "./pages/InsuranceAlerts";
import { DocumentLibrary } from "./pages/DocumentLibrary";
import { Vehicles } from "./pages/Vehicles";

/* LEASES */
import { LeaseForm } from "./pages/LeaseForm";
import { LeaseFormBedroom } from "./pages/LeaseFormBedroom";
import { LeaseHistory } from "./pages/LeaseHistory";
import { RentRoll } from "./pages/RentRoll";

/* PAYMENTS */
import { Invoices } from "./pages/Invoices";
import PaymentsReceived from "./pages/PaymentsReceived";
import OutstandingDues from "./pages/OutstandingDues";
import RefundsAdjustments from "./pages/RefundsAdjustments";
import { PaymentForm } from "./pages/PaymentForm";

/* ACCOUNTING */
import { Accounting } from "./pages/Accounting";
import { ChartOfAccounts } from "./pages/ChartOfAccounts";
import { TaxSettings } from "./pages/TaxSettings";
import { QuickBooksSettings } from "./pages/QuickBooksSettings";

/* REPORTS & SETTINGS */
import Reports from "./pages/Reports";
import { Maintenance } from "./pages/Maintenance";
import { Tickets } from "./pages/Tickets";
import Communication from "./pages/Communication";
import EmailComposer from "./pages/EmailComposer";
import EmailTemplates from "./pages/EmailTemplates";
import EmailHistory from "./pages/EmailHistory";
import Settings from "./pages/Settings";
import { Owners } from "./pages/Owners";
import { TeamManagement } from "./pages/TeamManagement";
import { TeamInvite } from "./pages/TeamInvite";
import SMSInbox from "./pages/SMSInbox";
import SMSCampaigns from "./pages/SMSCampaigns";
import SMSTemplates from "./pages/SMSTemplates";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Support } from "./pages/Support";
import { ShuttleManagement } from "./pages/ShuttleManagement";

/* WORKFLOW */
import MoveInDashboard from "./pages/workflow/MoveInDashboard";
import MoveOutDashboard from "./pages/workflow/MoveOutDashboard";
import UnitPrepDashboard from "./pages/workflow/UnitPrepDashboard";
import InspectionList from "./pages/workflow/InspectionList";
import InspectionTemplates from "./pages/workflow/InspectionTemplates";
import NewInspectionWizard from "./pages/workflow/NewInspectionWizard";
import InspectionForm from "./pages/workflow/InspectionForm";
import InspectionOverview from "./pages/workflow/InspectionOverview";
import CreateInspectionTemplate from "./pages/workflow/CreateInspectionTemplate";
import ResponseGroups from "./pages/workflow/ResponseGroups";

/* TENANT PORTAL */
import { TenantProtectedRoute } from "./components/TenantProtectedRoute";
import {
  TenantDashboard,
  TenantLease,
  TenantInvoices,
  TenantPayments,
  TenantDocuments,
  TenantInsurance,
  TenantTickets,
  TenantVehicles,
  TenantChat,
  TenantInvite,
  TenantReports
} from "./pages/tenant";

/* OWNER PORTAL */
import { OwnerProtectedRoute } from "./components/OwnerProtectedRoute";
import { OwnerDashboard } from "./pages/owner/OwnerDashboard";
import { OwnerProperties } from "./pages/owner/OwnerProperties";
import { OwnerFinancials } from "./pages/owner/OwnerFinancials";
import { OwnerReports } from "./pages/owner/OwnerReports";
import { OwnerChat } from "./pages/owner/OwnerChat"; // Added

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 ROOT → LOGIN */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 🔐 LOGIN */}
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<TeamInvite />} />

        {/* 🔒 PROTECTED AREA */}
        <Route element={<ProtectedRoute />}>
          {/* DASHBOARD */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/select-property" element={<SelectProperty />} />
          <Route path="/vacancy" element={<VacancyDashboard />} />
          <Route path="/revenue" element={<RevenueDashboard />} />

          {/* PROPERTIES */}
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/buildings" element={<Buildings />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />

          {/* UNITS */}
          <Route path="/units" element={<Units />} />
          <Route path="/units/:id" element={<UnitDetail />} />
          <Route path="/units/:id/bedrooms" element={<BedroomSetup />} />
          <Route path="/units/:id/switch-mode" element={<RentalModeSwitch />} />
          <Route path="/unit-readiness" element={<UnitReadiness />} />

          {/* TENANTS */}
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/tenants/:id" element={<Tenants />} />
          <Route path="/tenants/vehicles" element={<Vehicles />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/insurance-alerts" element={<InsuranceAlerts />} />
          <Route path="/documents" element={<DocumentLibrary />} />

          {/* LEASES */}
          <Route path="/leases" element={<LeaseHistory />} />
          <Route path="/leases/new" element={<LeaseForm />} />
          <Route path="/leases/new-bedroom" element={<LeaseFormBedroom />} />
          <Route path="/rent-roll" element={<RentRoll />} />

          {/* PAYMENTS */}
          <Route path="/payments/invoices" element={<Invoices />} />
          <Route path="/payments/received" element={<PaymentsReceived />} />
          <Route path="/payments/outstanding" element={<OutstandingDues />} />
          <Route path="/payments/refunds" element={<RefundsAdjustments />} />
          <Route path="/payments/new" element={<PaymentForm />} />

          {/* ACCOUNTING */}
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/accounting/tax-settings" element={<TaxSettings />} />
          <Route path="/settings/quickbooks" element={<QuickBooksSettings />} />

          {/* REPORTS & SETTINGS */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/admin/email/composer" element={<EmailComposer />} />
          <Route path="/admin/email/templates" element={<EmailTemplates />} />
          <Route path="/admin/email/history" element={<EmailHistory />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />

          {/* SMS ENHANCEMENT */}
          <Route path="/admin/sms/inbox" element={<SMSInbox />} />
          <Route path="/admin/sms/campaigns" element={<SMSCampaigns />} />
          <Route path="/admin/sms/templates" element={<SMSTemplates />} />
          <Route path="/shuttle" element={<ShuttleManagement />} />

          {/* WORKFLOW ROUTES */}
          <Route path="/admin/workflow/move-in" element={<MoveInDashboard />} />
          <Route path="/admin/workflow/move-out" element={<MoveOutDashboard />} />
          <Route path="/admin/workflow/unit-prep" element={<UnitPrepDashboard />} />
          <Route path="/admin/workflow/inspections" element={<InspectionList />} />
          <Route path="/admin/workflow/templates" element={<InspectionTemplates />} />
          <Route path="/admin/workflow/templates/new" element={<CreateInspectionTemplate />} />
          <Route path="/admin/workflow/templates/:id/edit" element={<CreateInspectionTemplate />} />
          <Route path="/admin/workflow/response-groups" element={<ResponseGroups />} />
          <Route path="/admin/workflow/inspections/new" element={<NewInspectionWizard />} />
          <Route path="/admin/workflow/inspections/:id" element={<InspectionOverview />} />
          <Route path="/admin/workflow/inspections/:id/form" element={<InspectionForm />} />
        </Route>

        {/* 📄 PUBLIC PAGES */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/support" element={<Support />} />

        {/* 🏢 TENANT PORTAL */}
        <Route path="/tenant/login" element={<Navigate to="/login" replace />} />
        <Route path="/tenant/invite/:token" element={<TenantInvite />} />
        <Route element={<TenantProtectedRoute />}>
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/tenant/lease" element={<TenantLease />} />
          <Route path="/tenant/invoices" element={<TenantInvoices />} />
          <Route path="/tenant/payments" element={<TenantPayments />} />
          <Route path="/tenant/documents" element={<TenantDocuments />} />
          <Route path="/tenant/insurance" element={<TenantInsurance />} />
          <Route path="/tenant/tickets" element={<TenantTickets />} />
          <Route path="/tenant/vehicles" element={<TenantVehicles />} />
          <Route path="/tenant/communication" element={<TenantChat />} />
          <Route path="/tenant/reports" element={<TenantReports />} />
        </Route>

        {/* 🗝️ OWNER PORTAL */}
        <Route path="/owner/login" element={<Navigate to="/login" replace />} />
        <Route element={<OwnerProtectedRoute />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/properties" element={<OwnerProperties />} />
          <Route path="/owner/financials" element={<OwnerFinancials />} />
          <Route path="/owner/reports" element={<OwnerReports />} />
          <Route path="/owner/rent-roll" element={<RentRoll />} />
          <Route path="/owner/communication" element={<OwnerChat />} /> {/* Added */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
