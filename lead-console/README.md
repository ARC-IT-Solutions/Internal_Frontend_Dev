# Lead Console — Internal Dashboard
Inquiries + Client Ticket Management · Vanilla JS · Zero build step

---

## System Architecture

```
3 frontends, 1 Spring Boot backend
─────────────────────────────────────────────────────────
  [Your Website]          → POST /api/inquiries        (public form submit)
  [Client Portal]         → POST /api/tickets          (onboarded client raises ticket)
  [This: Lead Console]    → GET/PATCH /api/inquiries   (staff manage inquiries)
                          → GET/PATCH /api/tickets     (staff manage tickets)
                          → POST /api/tickets/:id/replies
```

All three frontends talk to the **same Spring Boot backend** via REST.
This console is read-write for staff. The client portal is write-only for clients.

---

## Quick Start

No build tools. No npm. No webpack. Serve the folder:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# VS Code: Live Server extension
```

Open `http://localhost:8080`

ES Modules require HTTP — not `file://` double-click.

---

## Connect Your Backend

Edit the top of `js/api.js`:

```js
const CONFIG = {
  BASE_URL: 'https://your-springboot-app.com/api',  // ← your backend
  POLL_INTERVAL_MS: 15000,
  MOCK: false,  // ← flip to false
};
```

---

## Spring Boot API Contract

### CORS

Your Spring Boot app must allow the console's origin:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://your-console-domain.com")
                .allowedMethods("GET", "POST", "PATCH", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

---

### Authentication (recommended)

Add a Bearer token header. In `api.js` `http()` function, add:

```js
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('staff_token')}`,
},
```

---

### Inquiry Endpoints

#### `GET /api/inquiries`

Query params: `limit`, `sort` (`asc`|`desc`), `status`

**Response** `200 OK`:
```json
[
  {
    "id": "inq_001",
    "name": "Sarah Mitchell",
    "phone": "+971501234567",
    "email": "sarah@email.com",
    "service_type": "Kitchen Renovation",
    "message": "Full kitchen remodel, budget 50k...",
    "timestamp": "2025-04-05T09:32:00Z",
    "status": "new",
    "assigned_to": "Unassigned",
    "read": false,
    "source": "website_form"
  }
]
```

Status values: `new` | `contacted` | `in_progress` | `closed`

#### `PATCH /api/inquiries/{id}`

**Request body** (any subset):
```json
{
  "status": "contacted",
  "assigned_to": "Ahmed",
  "read": true
}
```

**Response** `200 OK`: Updated inquiry object.

---

### Ticket Endpoints

#### `GET /api/tickets`

Query params: `limit`, `sort`, `status`, `priority`, `client_id`

**Response** `200 OK`:
```json
[
  {
    "id": "tkt_001",
    "ticket_number": "TKT-1001",
    "client_id": "cli_001",
    "client_name": "Priya Sharma",
    "client_email": "priya.s@work.com",
    "project": "Office Fitout — Al Quoz",
    "category": "Delay",
    "subject": "Electrical work not started on schedule",
    "description": "Full description of the issue...",
    "priority": "high",
    "status": "open",
    "assigned_to": "Ahmed",
    "created_at": "2025-04-05T07:00:00Z",
    "updated_at": "2025-04-05T07:00:00Z",
    "read": false,
    "replies": []
  }
]
```

Priority values:   `low` | `medium` | `high` | `critical`
Status values:     `open` | `in_progress` | `pending` | `resolved` | `closed`
Category examples: `Delay` | `Material Issue` | `Invoice Query` | `Snagging` | `Clarification`

#### `PATCH /api/tickets/{id}`

**Request body** (any subset):
```json
{
  "status": "in_progress",
  "priority": "critical",
  "assigned_to": "Sara",
  "read": true
}
```

#### `POST /api/tickets/{id}/replies`

**Request body**:
```json
{
  "body": "Hi James, I have escalated this to the procurement team..."
}
```

**Response** `201 Created`:
```json
{
  "id": "rep_005",
  "author": "Ahmed",
  "author_role": "staff",
  "body": "Hi James, I have escalated this to the procurement team...",
  "created_at": "2025-04-05T10:15:00Z"
}
```

`author_role`: `staff` | `client`

---

### Employee & Client Endpoints

#### `GET /api/employees`
```json
["Unassigned", "Ahmed", "Sara", "Khalid", "Nour", "Rami"]
```

#### `GET /api/clients`
```json
[
  { "id": "cli_001", "name": "Priya Sharma", "email": "priya.s@work.com" }
]
```

---

## Spring Boot Entity Examples

### Inquiry Entity (JPA)
```java
@Entity
@Table(name = "inquiries")
public class Inquiry {
    @Id private String id;
    private String name;
    private String phone;
    private String email;
    private String serviceType;
    @Lob private String message;
    private Instant timestamp;
    private String status;      // new, contacted, in_progress, closed
    private String assignedTo;
    private Boolean read;
    private String source;
}
```

### Ticket Entity (JPA)
```java
@Entity
@Table(name = "tickets")
public class Ticket {
    @Id private String id;
    private String ticketNumber;
    private String clientId;
    private String clientName;
    private String clientEmail;
    private String project;
    private String category;
    private String subject;
    @Lob private String description;
    private String priority;    // low, medium, high, critical
    private String status;      // open, in_progress, pending, resolved, closed
    private String assignedTo;
    private Instant createdAt;
    private Instant updatedAt;
    private Boolean read;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL)
    private List<TicketReply> replies;
}

@Entity
@Table(name = "ticket_replies")
public class TicketReply {
    @Id private String id;
    @ManyToOne @JoinColumn(name = "ticket_id") private Ticket ticket;
    private String author;
    private String authorRole;  // staff | client
    @Lob private String body;
    private Instant createdAt;
}
```

---

## File Structure

```
lead-console/
├── index.html          ← App shell. No logic.
├── css/
│   └── main.css        ← All styles. Dark theme. Responsive.
└── js/
    ├── main.js         ← Boot, event wiring, polling
    ├── state.js        ← Unified store: inquiries + tickets + UI state
    ├── api.js          ← All HTTP calls + mock data
    ├── ui.js           ← All DOM rendering
    └── notify.js       ← Push, audio, badge, visual bar
```

---

## Features

| Feature | Inquiries | Tickets |
|---------|-----------|---------|
| Real-time list (15s poll) | ✓ | ✓ |
| Browser push notification | ✓ | ✓ |
| Audio chime (different per type) | ✓ | ✓ |
| Tab badge count | ✓ | ✓ |
| Status filter | ✓ | ✓ |
| Priority filter | — | ✓ |
| Status management | ✓ | ✓ |
| Assignment | ✓ | ✓ |
| Overdue detection | 15 min | By priority SLA |
| Quick actions | Call, WhatsApp, Email | Email, Resolve, Close |
| Reply thread | — | ✓ (Ctrl+Enter to send) |
| Mobile responsive | ✓ | ✓ |
| Keyboard navigation | ✓ | ✓ |
| Optimistic UI updates | ✓ | ✓ |

---

## Overdue SLA (Tickets)

| Priority | Overdue after |
|----------|--------------|
| Critical | 4 hours |
| High     | 8 hours |
| Medium   | 24 hours |
| Low      | 72 hours |

Adjust in `state.js → isTicketOverdue()`.

---

## Polling vs WebSocket

Default: polls every 15 seconds.

To upgrade to WebSocket (in `main.js`, after `API.startPolling()` remove it and add):

```js
const ws = new WebSocket('wss://your-backend.com/ws');
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === 'new_inquiry') {
    const newOnes = State.setInquiries([...State.getAllInquiries(), msg.payload]);
    Notify.triggerForNewInquiries(newOnes);
    UI.renderInquiryList();
  }
  if (msg.type === 'new_ticket') {
    const newOnes = State.setTickets([...State.getAllTickets(), msg.payload]);
    Notify.triggerForNewTickets(newOnes);
    UI.renderTicketList();
  }
};
```

No other files need changing.

---

## Browser Support

Chrome 80+, Firefox 75+, Safari 14+, Edge 80+.
Requires ES Modules. No IE.
