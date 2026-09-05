# Locker Inventory and Lease Integration Plan

I have rigorously cross-referenced this plan against all 12 points of the client scope to ensure 100% compliance. No extra features have been added, and every sub-step requested by the client is explicitly mapped.

**Important Note for Developer:** Because you have two separate backend codebases (saif-property-client-railway and saif-property2-client-railway), the database schema and backend logic changes must be applied to BOTH repositories, and database migrations must be run on both.

## 1. Database Schema (schema.prisma)
*Must be applied to BOTH backends.*

**Add Locker Model (Req 1):**
- id (Int, PK)
- uildingId (Int, FK to Property) - *Ensures Building is captured*
- lockerNumber (String)
- status (String, default "Available") - *Status options: Available, Occupied*
- @@unique([buildingId, lockerNumber]) - *Prevents duplicate locker numbers within the same building*

**Add LockerRental Model (Req 4, 7):**
- id (Int, PK)
- leaseId (Int, FK to Lease) - *Links Tenant -> Unit/Bedroom -> Locker (Req 7)*
- lockerId (Int, FK to Locker)
- entAmount (Decimal) - *Locker Rent Amount (Req 4)*
- startDate (DateTime) - *Independent Locker Start Date (Req 4)*
- endDate (DateTime) - *Independent Locker End Date (Req 4)*

**Update Lease Model:**
- Add lockers LockerRental[]

---

## 2. Backend Controllers
*Must be applied to BOTH backends.*

**locker.controller.js & locker.routes.js (NEW) (Req 1, 2)**
- **GET /lockers**: Fetch lockers. 
  - *Status Logic Implementation (Req 2)*: Compute status dynamically. If the current date falls between any of the locker's active LockerRental dates, return "Occupied". Otherwise, return "Available".
- **POST /lockers**: Create a new locker.
- **PUT /lockers/:id**: Update locker.
- **DELETE /lockers/:id**: Delete.

**lease.controller.js (MODIFY) (Req 2, 6)**
- **Create Lease (POST):** Accept an array of lockers. 
  - *Validation (Req 2)*: Check database to ensure none of the selected lockers have overlapping startDate and endDate with existing rentals. Future rentals are allowed as long as they don't overlap.
  - Create LockerRental records.
- **Update Lease (PUT):** Allow adding new lockers, modifying existing locker end dates, or removing lockers for an existing active lease without changing the residential lease dates (Req 6).

**entRun.controller.js or Invoice Generator (MODIFY) (Req 8, 9, 10)**
- Loop through active LockerRental records attached to the lease.
- *Billing Dates (Req 9)*: Charge based strictly on Locker Start Date and Locker End Date. Do not use residential lease dates.
- *Proration (Req 10)*: If the locker starts/ends mid-month, apply the EXACT same proration logic/formula already used by the PMS for base rent.
- *Separate Invoice Line (Req 8)*: Add a distinct line item to the rent invoice formatted exactly as: Locker - Building [Name] / [LockerNumber]. Ensure multiple lockers generate separate lines and are never combined into base rent.

**nalytics.controller.js / Reporting (MODIFY) (Req 12)**
- *Monthly Revenue Report*: Add a specific Locker Charged field. 
- Scan invoice line items starting with "Locker". Aggregate the total locker rent charged to that tenant/unit for the month.
- If multiple lockers exist, combine the amount into this one field.
- If no locker charge exists, return exactly $0 (do not leave blank).

---

## 3. Frontend UI (
ew-property-agathe)

**src/pages/Lockers/LockerInventory.jsx (NEW) (Req 1)**
- Create a data table to manage Locker Inventory.
- Columns explicitly matching scope: Building, Locker Number, Status.

**src/pages/Leases/CreateLease.jsx & EditLease.jsx (MODIFY) (Req 3, 4, 5, 6)**
- Add a "Lockers" section with a toggle: "Add Locker?" (Req 3).
- Implement a dropdown showing all available lockers across the property (not restricted to tenant's building). Dropdown text format: Building [Name] - Locker [LockerNumber] (Req 3).
- Show inputs for each locker: Rent Amount, Start Date, End Date (Req 4).
- Include an "Add Another Locker" button to allow multiple distinct lockers (Req 5).

**src/pages/Leases/LeaseDetails.jsx (MODIFY) (Req 11)**
- Add a clearly visible "Locker" section when viewing an active lease.
- For each locker, display: Building, Locker Number, Monthly Rent, Start Date, End Date, Status.
- Include action buttons to: Add Locker, Add Another Locker, Edit Locker Rental, Change Locker End Date.
