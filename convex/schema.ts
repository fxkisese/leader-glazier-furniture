import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One line of a production cost sheet, e.g. "Mahogany timber — 12 ft × KSh 450"
export const costLine = v.object({
  label: v.string(),
  type: v.string(), // materials | labour | transport | finishing | other
  quantity: v.number(),
  unit: v.optional(v.string()),
  unit_cost: v.number(),
  supplier: v.optional(v.string()), // who it was bought from
});

// ── Business modules: field lists are shared with the CRUD functions ──
export const employeeFields = {
  name: v.string(),
  phone: v.optional(v.string()),
  national_id: v.optional(v.string()),
  position: v.optional(v.string()), // carpenter, upholsterer, sales...
  pay_type: v.string(), // monthly | daily | piece
  pay_rate: v.optional(v.number()), // monthly salary or daily rate; piece work is entered per job
  start_date: v.optional(v.string()),
  status: v.optional(v.string()), // active | left
  emergency_contact: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const payEntryFields = {
  employee_id: v.string(),
  date: v.string(), // YYYY-MM-DD; counts toward that month's pay
  type: v.string(), // piece | bonus | advance | deduction
  description: v.optional(v.string()),
  quantity: v.optional(v.number()),
  rate: v.optional(v.number()),
  amount: v.number(), // always positive; type decides the direction
};

export const customerFields = {
  name: v.string(),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const supplierFields = {
  name: v.string(),
  phone: v.optional(v.string()),
  supplies: v.optional(v.string()), // older free-text "what they sell"; replaced by price_list
  location: v.optional(v.string()),
  delivery_fee: v.optional(v.number()), // what they charge to deliver an order
  price_list: v.optional(v.array(v.object({
    item: v.string(), // Boards, Ply, Paint...
    unit: v.optional(v.string()), // sheet, ft, litre
    price: v.optional(v.number()), // per unit
  }))),
  notes: v.optional(v.string()),
};

export const purchaseFields = {
  supplier_id: v.string(),
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  amount_paid: v.optional(v.number()),
  notes: v.optional(v.string()),
};

export const jobFields = {
  title: v.string(),
  quantity: v.optional(v.number()),
  customer_name: v.optional(v.string()),
  assigned_to: v.optional(v.string()), // employee id
  stage: v.string(), // queued | cutting | assembly | upholstery | finishing | ready | delivered
  priority: v.optional(v.string()), // normal | urgent
  due_date: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export default defineSchema({
  staff_accounts: defineTable({
    name: v.string(),
    username: v.string(), // lowercase
    password_hash: v.string(),
    salt: v.string(),
    role: v.string(), // see permissions.ts
    active: v.optional(v.boolean()),
  }).index("by_username", ["username"]),

  sessions: defineTable({
    token: v.string(),
    account_id: v.id("staff_accounts"),
    expires_at: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_account", ["account_id"]),

  employees: defineTable(employeeFields),
  attendance: defineTable({
    employee_id: v.string(),
    date: v.string(),
    status: v.string(), // present | half | absent | leave
  })
    .index("by_date", ["date"])
    .index("by_employee_date", ["employee_id", "date"]),
  pay_entries: defineTable(payEntryFields),
  payslips: defineTable({
    employee_id: v.string(),
    employee_name: v.string(),
    month: v.string(), // YYYY-MM
    pay_type: v.string(),
    days_worked: v.optional(v.number()),
    base_pay: v.number(),
    piece_pay: v.number(),
    bonuses: v.number(),
    advances: v.number(),
    deductions: v.number(),
    gross: v.number(),
    net: v.number(),
    paid_date: v.string(),
    payment_method: v.optional(v.string()),
    expense_id: v.optional(v.string()), // the wages expense created when it was paid
  }).index("by_month", ["month"]),

  customers: defineTable(customerFields),
  suppliers: defineTable(supplierFields),
  purchases: defineTable(purchaseFields),
  production_jobs: defineTable(jobFields),

  products: defineTable({
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    price: v.number(),
    discount_price: v.optional(v.number()),
    description: v.optional(v.string()),
    material: v.optional(v.string()),
    dimensions: v.optional(v.string()),
    colors: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stock_status: v.optional(v.string()),
    label: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    whatsapp_message: v.optional(v.string()),
    delivery_note: v.optional(v.string()),
    seating_capacity: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_is_featured", ["is_featured"])
    .index("by_is_published", ["is_published"]),

  glass_types: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    thickness: v.optional(v.string()),
    price_per_sqft: v.number(),
    min_order_sqft: v.optional(v.number()),
    installation_price: v.optional(v.number()),
    frame_price_per_sqft: v.optional(v.number()),
    is_available: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  }).index("by_category", ["category"]),

  quote_requests: defineTable({
    customer_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    glass_type_id: v.optional(v.string()),
    glass_type_name: v.string(),
    width: v.number(),
    height: v.number(),
    unit: v.string(),
    area_sqft: v.optional(v.number()),
    quantity: v.optional(v.number()),
    include_installation: v.optional(v.boolean()),
    include_frame: v.optional(v.boolean()),
    include_delivery: v.optional(v.boolean()),
    delivery_location: v.optional(v.string()),
    estimated_total: v.number(),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  custom_order_requests: defineTable({
    customer_name: v.string(),
    phone: v.string(),
    product_type: v.string(),
    measurements: v.optional(v.string()),
    reference_image: v.optional(v.string()),
    preferred_material: v.optional(v.string()),
    budget: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_status", ["status"]),

  gallery_items: defineTable({
    title: v.string(),
    category: v.string(),
    images: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  })
    .index("by_category", ["category"])
    .index("by_is_featured", ["is_featured"]),

  hero_media: defineTable({
    type: v.string(), // "image" | "video"
    url: v.string(),
    poster: v.optional(v.string()),
    width: v.optional(v.number()), // pixel size, so the hero knows portrait from landscape before loading
    height: v.optional(v.number()),
    eyebrow: v.optional(v.string()),
    title: v.optional(v.string()), // one line per row of the headline
    subtitle: v.optional(v.string()),
    order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  }),

  reviews: defineTable({
    customer_name: v.string(),
    rating: v.number(),
    comment: v.string(),
    product_type: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  }).index("by_is_featured", ["is_featured"]),

  // Production cost sheets: every shilling that went into making an item, and how many are left.
  inventory_items: defineTable({
    name: v.string(),
    category: v.optional(v.string()),
    product_id: v.optional(v.string()), // linked website product, if any
    quantity_made: v.optional(v.number()), // units this cost sheet covers
    stock_qty: v.optional(v.number()), // units still on hand
    cost_lines: v.optional(v.array(costLine)),
    selling_price: v.optional(v.number()), // planned price per unit
    date: v.optional(v.string()), // production date, YYYY-MM-DD
    notes: v.optional(v.string()),
  }),

  sales: defineTable({
    product_id: v.optional(v.string()),
    product_name: v.optional(v.string()),
    inventory_item_id: v.optional(v.string()),
    customer_id: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit_price: v.optional(v.number()),
    unit_cost: v.optional(v.number()), // production cost per unit at the time of sale
    cost_lines: v.optional(v.array(costLine)), // the item's cost sheet at the time of sale
    cost_batch: v.optional(v.number()), // units those cost lines cover
    amount: v.optional(v.number()), // total sale value
    amount_paid: v.optional(v.number()),
    date: v.optional(v.string()), // YYYY-MM-DD
    customer_name: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    payment_method: v.optional(v.string()),
    status: v.optional(v.string()), // paid | partial | unpaid
    notes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  credit_customers: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    total_credit: v.optional(v.number()),
    amount_paid: v.optional(v.number()),
    balance: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  expenses: defineTable({
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_category", ["category"]),

  accessories: defineTable({
    name: v.string(),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    stock_qty: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  standard_sizes: defineTable({
    glass_type_id: v.optional(v.string()),
    label: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
  }),

  site_settings: defineTable({
    business_name: v.string(),
    whatsapp_number: v.string(),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    delivery_policy: v.optional(v.string()),
    delivery_base_price: v.optional(v.number()),
    installation_base_price: v.optional(v.number()),
    hero_tagline: v.optional(v.string()),
    about_text: v.optional(v.string()),
  }),

  quote_accessories: defineTable({
    quote_request_id: v.optional(v.string()),
    accessory_id: v.optional(v.string()),
    accessory_name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit_price: v.optional(v.number()),
    total_price: v.optional(v.number()),
  }),
});
