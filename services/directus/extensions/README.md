# Directus Extensions

This directory contains custom Directus 11 extensions for SynthStack's comprehensive business management suite.

## Panel Extensions

### 1. Invoice Manager (`invoice-manager/`)

Professional invoice management panel with Stripe integration.

**Features**:
- Invoice list with filtering (status, search)
- Summary cards (total paid, outstanding, overdue)
- Quick actions (create, send, Stripe checkout)
- PDF download support
- Status management (draft → sent → paid)

**Configuration Options**:
- `apiBaseUrl`: SynthStack API Gateway base URL (default: `http://localhost:3003`)
- `showQuickActions`: Display quick action buttons (default: true)
- `defaultFilter`: Default invoice filter (default: 'all')
- `itemsPerPage`: Number of invoices per page (default: 10)

**Minimum Size**: 18 wide × 12 tall

### 2. CRM Pipeline (`crm-pipeline/`)

Visual sales pipeline with drag-and-drop Kanban board.

**Features**:
- Kanban board with deal stages
- Drag-and-drop deal movement
- Pipeline metrics (total value, weighted value, win rate)
- List view alternative
- Convert won deals to projects
- Stage-based probability updates

**Configuration Options**:
- `showMetrics`: Display pipeline metrics (default: true)
- `groupBy`: Group deals by stage/organization/owner (default: 'stage')
- `defaultView`: Default view mode kanban/list (default: 'kanban')

**Minimum Size**: 24 wide × 16 tall

### 3. SEO Keywords (`seo-keywords/`)

SEO keyword analysis panel (existing).

## Building Extensions

### Development Mode

```bash
cd services/directus/extensions/invoice-manager
npm install
npm run dev
```

### Production Build

```bash
cd services/directus/extensions/invoice-manager
npm install
npm run build
```

The built extension will be in `dist/` directory.

### Build All Extensions

```bash
cd services/directus/extensions
for dir in */; do
  if [ -f "$dir/package.json" ]; then
    echo "Building $dir..."
    cd "$dir"
    npm install
    npm run build
    cd ..
  fi
done
```

## Docker Build

Extensions are automatically built during the Directus Docker image build:

```dockerfile
# Copy extensions
COPY ./extensions /directus/extensions/

# Build extensions
RUN cd /directus/extensions && \
    for dir in */; do \
      if [ -f "$dir/package.json" ]; then \
        cd "$dir" && npm install && npm run build && cd ..; \
      fi \
    done
```

## Run Scripts (Flows)

Directus flows with embedded JavaScript for business logic automation.

Located in: `extensions/flows/`

### 1. Calculate Invoice Items (`calculate-invoice-items.js`)

**Triggers**: `items.create`, `items.update` on `invoice_items`

**Purpose**: Auto-calculate line amounts, tax amounts, and invoice totals

**Logic**:
1. Calculate `line_amount = quantity × unit_price`
2. Calculate `tax_amount = line_amount × tax_rate`
3. Sum all items to update invoice `subtotal`, `total_tax`, `total`

### 2. Update Payment Status (`update-payment-status.js`)

**Triggers**: `items.create`, `items.update` on `payments`

**Purpose**: Auto-update invoice payment status

**Logic**:
1. Sum all completed payments for invoice
2. Update invoice `amount_paid`
3. Set status: `paid` if fully paid, `partial` if partially paid

## API Integration

### Invoice Manager API Endpoints

The Invoice Manager panel expects these API routes:

- `GET /items/invoices` - List invoices with filters
- `GET /items/invoices/:id` - Get single invoice
- `PATCH /items/invoices/:id` - Update invoice
- `POST {API_BASE_URL}/api/v1/admin/invoices/:invoiceId/checkout` - Create Stripe checkout session (API Gateway, admin auth)

### CRM Pipeline API Endpoints

The CRM Pipeline panel expects these API routes:

- `GET /items/deal_stages` - List all deal stages
- `GET /items/deals` - List deals with filters
- `GET /items/deals/:id` - Get single deal
- `PATCH /items/deals/:id` - Update deal (move stages)
- `POST /items/projects` - Create project from won deal

## Extension Development

### TypeScript Types

Extensions use TypeScript with Directus SDK types:

```typescript
import { definePanel } from '@directus/extensions-sdk';
import { useApi } from '@directus/extensions-sdk';
```

### Vue 3 Composition API

All panels use Vue 3 Composition API:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const loading = ref(true);
const data = ref([]);

onMounted(async () => {
  // Load data
});
</script>
```

### Directus Components

Available components:
- `<v-table>` - Data table with sorting, pagination
- `<v-button>` - Button with icon support
- `<v-icon>` - Material Design icons
- `<v-badge>` - Status badges
- `<v-select>` - Dropdown select
- `<v-input>` - Text input
- `<v-notice>` - Info/warning/error notices
- `<v-pagination>` - Page navigation
- `<v-progress-circular>` - Loading spinner

### Panel Configuration

Define panel options in `index.ts`:

```typescript
export default definePanel({
  id: 'my-panel',
  name: 'My Panel',
  icon: 'dashboard',
  description: 'Panel description',
  component: PanelComponent,
  options: [
    {
      field: 'myOption',
      name: 'My Option',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half'
      },
      schema: {
        default_value: true
      }
    }
  ],
  minWidth: 12,
  minHeight: 8
});
```

## Testing

### Manual Testing

1. Build extension: `npm run build`
2. Restart Directus: `docker-compose restart directus`
3. Navigate to Insights > Create Insight
4. Add panel to dashboard
5. Configure panel options
6. Test functionality

### E2E Testing

Located in: `/tests/admin/e2e/`

Example test:

```typescript
test('Invoice Manager displays invoices', async ({ page }) => {
  await page.goto('/admin/insights/invoices');
  await expect(page.locator('.invoice-manager')).toBeVisible();
  await expect(page.locator('.summary-cards')).toBeVisible();
});
```

## Troubleshooting

### Extension Not Showing

1. Check build output: `npm run build`
2. Verify `dist/index.js` exists
3. Check Directus logs: `docker-compose logs directus`
4. Restart Directus: `docker-compose restart directus`

### API Errors

1. Check browser console for errors
2. Verify API routes exist in `packages/api-gateway/`
3. Check Directus permissions for collections
4. Verify database migrations ran successfully

### TypeScript Errors

1. Update SDK: `npm install @directus/extensions-sdk@latest`
2. Check `tsconfig.json` configuration
3. Verify Vue 3 types: `npm install @types/vue@latest`

## Resources

- [Directus Extensions SDK](https://docs.directus.io/extensions/introduction.html)
- [Directus Panel API](https://docs.directus.io/extensions/panels.html)
- [Vue 3 Documentation](https://vuejs.org/)
- [Material Design Icons](https://fonts.google.com/icons)
