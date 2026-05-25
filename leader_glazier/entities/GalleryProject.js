{
  "name": "GalleryProject",
  "type": "object",
  "properties": {
    "title": {
      "type": "string"
    },
    "category": {
      "type": "string",
      "enum": [
        "furniture",
        "glass",
        "custom",
        "interior"
      ]
    },
    "images": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "description": {
      "type": "string"
    },
    "is_featured": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "title",
    "category"
  ]
}