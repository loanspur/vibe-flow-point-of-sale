
---

# ✅ **Project Development Standards & AI Workflow Index**

This document defines the **core rules, best practices, and AI-assisted development prompts** for all projects. It is optimized for indexing in **Cursor AI** and serves as the **single source of truth** for code quality, documentation, and workflow automation.

---

## **1. Core Development Principles**

* ✅ **Reuse existing functions and components** wherever possible.
* ✅ Avoid **code redundancy, duplication, and hardcoding**.
* ✅ Apply **DRY principles** and modular coding structure.
* ✅ Implement **global form validation and submission rules** for all create/edit actions.
* ✅ **All data tables must include complete CRUD functionality**:

  * **Create/Edit** → Validates and updates database records.
  * **Delete** → Requires **confirmation modal** and enforces **RLS/RBAC restrictions**.
* ✅ **Business logic always takes precedence** over UI shortcuts.
* ✅ **No modification of existing UI components** without explicit approval.

---

## **2. Documentation & System Plan**

* ✅ **System Documentation** must be updated after:

  * Adding new features.
  * Fixing bugs or applying enhancements.
* ✅ **API Documentation**:

  * Maintain **Swagger/OpenAPI specs** for all endpoints.
  * Auto-generate updates when routes or models change.
* ✅ **User Guide & Role Permissions**:

  * Update instructions whenever features affect user workflows.

---

## **3. Feature Implementation Rules**

* ✅ Use **existing reusable code** before creating new implementations.
* ✅ Use **existing database access methods** before creating new database connections in Supabase.
* ✅ Maintain **compatibility with existing business logic**.
* ✅ Optimize for **clean, maintainable, and scalable code**.

---

## **4. Security & Permissions**

* ✅ Never hardcode **API keys or credentials**.
* ✅ Validate and sanitize **all user inputs**.
* ✅ Enforce **Role-Based Access Control (RBAC)** and **Row-Level Security (RLS)** for sensitive operations.

---

## **5. Version Control & CI/CD**

* ✅ Branching Strategy:

  * **Feature Branch → dev\_branch → main\_branch**.
* ✅ Merge only after:

  * Passing all tests.
  * Documentation updates complete.
* ✅ **CI/CD must auto-trigger:**

  * API docs update.
  * System documentation generation.
  * Test execution before deployment.

---

## **6. UI/UX Consistency**

* ✅ **Uniform Buttons Across the System**:
  Use the **design system’s button components** for all actions.
* ✅ **Uniform System Loading Indicators**:
  Implement **consistent loading animations and skeleton screens** whenever:

  * Buttons are clicked.
  * Data is being fetched or saved.
* ✅ Follow **design system tokens** for all new components.
* ✅ Ensure **responsiveness and accessibility** across devices.

---

## **7. Error Handling & Debugging**

* ✅ **Detailed Error Messages**:
  Provide **specific error details** (not generic messages) to ease debugging.
* ✅ **Standard Error Handling Pattern**:

  * Catch exceptions globally.
  * Show **friendly user-facing messages** and **developer logs** in console.
* ✅ **Error Logging**:
  All errors should be logged with **timestamp, API route, payload, and stack trace** for quick resolution.
* ✅ **Knowledge Base of Previous Errors**:
  Maintain a **reference log** of past issues and how they were fixed for **reuse in future debugging**.

---

### ✅ **Golden Rule**

> **Prioritize business logic, maintainability, and security above all shortcuts or temporary fixes.**

---

# 🧠 **Cursor AI Prompt Guide**

### **General Development Prompt**

```
Follow these rules:
- Reuse existing components; avoid duplication.
- Apply global form validation and submission logic.
- Ensure CRUD completeness in tables with delete confirmation and RLS.
- Maintain business logic integrity.
- Update system, API, and user documentation for new features.
- Use uniform buttons and loading indicators across the system.
- Apply detailed error handling with developer logs.
```

### **Feature Creation Prompt**

```
Create a new feature that:
- Uses existing reusable components/services.
- Implements global validation for create/edit forms.
- Adds CRUD to tables with delete confirmation and RLS.
- Includes consistent UI: buttons and loaders.
- Implements detailed error handling with logs.
- Updates API and system documentation automatically.
- Adds knowledge base entry for future reference.
```

### **Bug Fix Prompt**

```
Fix the bug while:
- Preserving business logic and existing functionality.
- Maintaining CRUD features and global form rules.
- Ensuring UI consistency (buttons and loaders).
- Applying proper error handling with detailed logs.
- Updating docs and knowledge base if behavior changes.
```

### **Code Review Prompt**

```
Review the code for:
- DRY compliance and no redundant code.
- Proper validation and CRUD operations.
- Security (RBAC, RLS, no hardcoded secrets).
- UI consistency with design system and loaders.
- Detailed error handling and logging.
- Documentation and user guide updates.
```

---

# ✅ **Testing Scenarios**

| **Feature**         | **Test Case**                | **Expected Result**                    |
| ------------------- | ---------------------------- | -------------------------------------- |
| **Create**          | Submit form with valid data  | Record is saved in DB                  |
|                     | Submit with invalid data     | Error message shown                    |
| **Read**            | Load table data              | All records display correctly          |
| **Update**          | Edit record and save         | Updated record persists in DB          |
|                     | Edit with invalid data       | Validation error shown                 |
| **Delete**          | Click delete                 | Confirmation modal appears             |
|                     | Confirm delete               | Record removed (if allowed by RLS)     |
|                     | Unauthorized delete          | Access denied message                  |
| **Form Validation** | Leave required field empty   | Error displayed                        |
| **Security (RBAC)** | User tries restricted action | Blocked with error                     |
| **UI Consistency**  | Click button during loading  | Loader appears uniformly across system |
| **Error Handling**  | Trigger known error          | Detailed error shown + logged properly |

---

# ✅ **Automatic Documentation Strategy**

### **System Documentation**

* Use **AI tools or Docusaurus** to auto-generate documentation after commits.

### **API Documentation**

* Use **Swagger/OpenAPI** to:

  * Auto-generate endpoint documentation on every update.
  * Validate request/response models.

### **User Guide Updates**

* Whenever a feature changes the UI:

  * Update **screenshots, usage steps, and role permissions**.

### **Error Knowledge Base**

* Maintain a **centralized log of recurring errors** with:

  * **Description of error**
  * **Root cause**
  * **Solution applied**
  * **Date fixed**
  * **Related module**

---

# ✅ **Roles & Permissions**

| **Role**        | **Permissions**                                      |
| --------------- | ---------------------------------------------------- |
| **Super Admin** | Full access to all modules and settings              |
| **Admin**       | Manage users, products, reports (organization level) |
| **Cashier**     | Process sales, returns, and assigned reports         |
| **Customer**    | View products, place orders, manage account          |

**Delete and sensitive actions must always follow RBAC & RLS.**

---

✅ This updated document now includes:
✔ **Knowledge Base for Similar Errors**
✔ **Uniform Loaders & Buttons**
✔ **Detailed Error Handling Strategy**
✔ **UI Consistency Testing**

---

Do you want me to **add a structured section for “Error Knowledge Base Template” (a table you can use in your docs for each error)**? Or should I also **include example entries of past bugs** so Cursor AI can use them for reference?