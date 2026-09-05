# Implementation Plan: PMS AI Assistant Module

## Goal Description
Integrate a central AI Assistant directly into the existing Property Management System (PMS). This assistant will allow users to ask questions in natural language and receive accurate, verifiable answers based on live PMS data and uploaded documents. The solution relies on Code-Level Blocking to ensure database security, explicitly preventing any data deletion or modification, and utilizes open-source infrastructure (Qdrant) hosted on your existing Railway account to avoid third-party limitations.

This plan addresses all 32 requirements outlined by the client, specifically accommodating the multi-database architecture currently in place.

---

## Proposed Implementation Strategy

This strategy is designed to be built centrally so it can be deployed across your backends without rebuilding the logic (#30 Scalability).

### 1. Developer Recommendation & Pricing (#32)
*   **AI Architecture:** LLM-powered Text-to-SQL Agent combined with a Node.js Query Validator, plus a Retrieval-Augmented Generation (RAG) pipeline for documents.
*   **Provider/Model:** OpenAI (GPT-4o). Highly recommended for complex SQL generation and understanding relational schemas. (Requires API Key from client).
*   **Vector Database (For Documents):** Qdrant. Hosted directly on your existing Railway account. Costs $0 in third-party API fees and has no artificial storage limits.
*   **Document Storage:** Cloudinary. Since your code already uploads to Cloudinary, we will read the PDFs directly from there. No new storage credentials needed.
*   **Database Connection:** Dynamic raw SQL execution using the `mysql2` package or dynamic Prisma clients, protected by a custom AST (Abstract Syntax Tree) SQL parser. No new database credentials required.
*   **Property Separation:** Dynamic Database Routing. Because properties use separate databases, the backend will dynamically connect to the correct database based on the property selected in the frontend dropdown.
*   **Database Restructuring:** None required. The AI will read the existing Prisma schema.
*   **Expected Costs:** ~$0.01 - $0.03 per query (OpenAI API). Qdrant will use your existing Railway resources.
*   **Scalability Confirmation:** The architecture supports connecting additional properties and PMS modules to the same AI Assistant without rebuilding, as the AI dynamically connects to whichever database URL is associated with the selected property.

### 2. Frontend Implementation (React)
*   **Global Interface (#18):** Add an "Ask AI" button accessible from anywhere in the PMS. No separate login required (#3).
*   **Context Awareness (#4):** The frontend will automatically pass the `selectedPropertyId` (from the admin dropdown) to the backend with every query.
*   **Conversational UI (#21):** The chat interface will maintain conversation history so users can ask follow-up questions.
*   **Response Formatting (#19, #25):** The UI will render tables, lists, and summaries natively. Tables will include an "Export to CSV/Excel" button.
*   **Verification (#20):** AI responses containing data totals will include a clickable button (e.g., "View 12 Tickets") that links back to the native PMS view or opens a detailed modal.

### 3. Backend Implementation (Node.js/Express)
*   **Central AI Controller (#1, #2):** Create a new route `POST /api/ai/query` in your primary backend. 
*   **Dynamic Database Connections:** When a request comes in, the controller will read the `selectedPropertyId`. It will look up the correct `DATABASE_URL` for that specific property/client and establish a temporary connection to that isolated database to execute the query.
*   **Schema Provisioning:** Extract the `schema.prisma` structure and provide it to the LLM in the system prompt so it understands the relationships (#7-16).
*   **Cross-Module Querying (#17):** Because the AI understands the full schema, it can natively write SQL `JOIN` statements to answer complex questions across modules within that specific database.
*   **Accuracy & Hallucination Prevention (#26):** The prompt will strictly instruct the AI to *only* answer based on retrieved data and explicitly state when data is missing.

### 4. Secure Code-Level Blocking Query Layer (#5, #27)
This is the core security mechanism to ensure the AI has **Read-Only Access** using your existing database credentials.

*   **Workflow:** User Question -> OpenAI translates to SQL -> Node.js Validates SQL -> Node.js Executes SQL on Correct DB -> OpenAI formats answer.
*   **Validation Logic:**
    1.  The backend receives the raw SQL string from OpenAI.
    2.  We use a library like `node-sql-parser` to parse the SQL into an Abstract Syntax Tree (AST).
    3.  **The Block:** We inspect the AST type. If the type is *anything* other than `SELECT` (e.g., `UPDATE`, `INSERT`, `DELETE`, `DROP`, `ALTER`), the backend instantly rejects the query and throws an error to the user.
    4.  **Property Isolation:** Guaranteed physically. The query is *only* executed against the database URL belonging to the selected property.
    5.  **Query Limits:** We append `LIMIT 500` to prevent massive data pulls from crashing the server.
*   **Execution:** Only if the query passes the AST validation, we execute it using the dynamically assigned database connection.

### 5. Document Retrieval / RAG (#28)
*   Deploy **Qdrant** on your Railway account.
*   **Multi-Tenant Vector DB:** Each property's documents will be saved in Qdrant with a metadata tag matching their `propertyId`. When searching, Qdrant will filter by this tag to ensure Property A never sees Property B's documents.
*   When a Lease/Inspection is uploaded to Cloudinary, a background worker downloads the PDF, extracts the text, converts it to vectors via OpenAI, and stores it in Qdrant.

### 6. Future AI Actions (#29)
*   The system is designed read-only initially. 
*   Because we are using Code-Level Blocking, we can later add specific "Action Handlers" (e.g., `createTicket()`) that bypass the SQL parser but require an explicit user confirmation modal on the frontend before execution.

## Verification Plan

Once the code is implemented, we will verify the security and functionality using the following tests:

### Automated/Manual Tests
- **Security Test 1:** Ask the AI to "Delete all tenants". Verify the backend AST parser blocks it and returns an error.
- **Security Test 2:** Ask the AI to "Change the rent for Unit 101 to $0". Verify the parser blocks it.
- **Physical Property Isolation Test:** Log in as Property A, ask for a tenant that only exists in Property B. Verify the AI returns nothing, confirming the database connections are correctly isolated based on the dropdown.
- **Document Retrieval Test:** Ask a specific question about a clause in an uploaded PDF lease. Verify the AI retrieves the correct paragraph from Qdrant, filtered by the active property ID.
