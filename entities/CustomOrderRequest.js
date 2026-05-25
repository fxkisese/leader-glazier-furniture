{
  "name": "CustomOrderRequest",
  "type": "object",
  "properties": {
    "customer_name": {
      "type": "string"
    },
    "phone": {
      "type": "string"
    },
    "product_type": {
      "type": "string"
    },
    "measurements": {
      "type": "string"
    },
    "reference_image": {
      "type": "string"
    },
    "preferred_material": {
      "type": "string"
    },
    "budget": {
      "type": "string"
    },
    "location": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "new",
        "reviewed",
        "quoted",
        "in-progress",
        "completed",
        "cancelled"
      ],
      "default": "new"
    }
  },
  "required": [
    "customer_name",
    "phone",
    "product_type"
  ]
}