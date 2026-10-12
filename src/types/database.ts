
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addon_groups": {
                  Row: {
                    "branch_id": string,"created_at": string,"id": string,"max_select": number,"min_select": number,"name_en": string,"name_ur": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"id"?: string,"max_select"?: number,"min_select"?: number,"name_en": string,"name_ur"?: string,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"id"?: string,"max_select"?: number,"min_select"?: number,"name_en"?: string,"name_ur"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addon_groups_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"addon_options": {
                  Row: {
                    "branch_id": string,"created_at": string,"extra_price": number,"group_id": string,"id": string,"is_available": boolean,"name_en": string,"name_ur": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"extra_price"?: number,"group_id": string,"id"?: string,"is_available"?: boolean,"name_en": string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"extra_price"?: number,"group_id"?: string,"id"?: string,"is_available"?: boolean,"name_en"?: string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addon_options_group_id_branch_id_fkey"
      columns: ["group_id","branch_id"]
isOneToOne: false
      referencedRelation: "addon_groups"
      referencedColumns: ["id","branch_id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"changed_by": string | null,"created_at": string,"id": string,"new_values": Json | null,"old_values": Json | null,"row_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"changed_by"?: string | null,"created_at"?: string,"id"?: string,"new_values"?: Json | null,"old_values"?: Json | null,"row_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"changed_by"?: string | null,"created_at"?: string,"id"?: string,"new_values"?: Json | null,"old_values"?: Json | null,"row_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"banners": {
                  Row: {
                    "branch_id": string,"created_at": string,"id": string,"image_path": string,"is_active": boolean,"sort_order": number,"title_en": string,"title_ur": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"id"?: string,"image_path": string,"is_active"?: boolean,"sort_order"?: number,"title_en"?: string,"title_ur"?: string,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"id"?: string,"image_path"?: string,"is_active"?: boolean,"sort_order"?: number,"title_en"?: string,"title_ur"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "banners_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"branch_settings": {
                  Row: {
                    "bank_account_number": string | null,"bank_account_title": string | null,"bank_iban": string | null,"bank_name": string | null,"branch_id": string,"created_at": string,"delivery_enabled": boolean,"easypaisa_account_title": string | null,"easypaisa_number": string | null,"estimated_delivery_minutes": number,"free_delivery_threshold": number | null,"jazzcash_account_title": string | null,"jazzcash_number": string | null,"min_order_amount": number,"road_distance_factor": number,"updated_at": string,"whatsapp_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bank_account_number"?: string | null,"bank_account_title"?: string | null,"bank_iban"?: string | null,"bank_name"?: string | null,"branch_id": string,"created_at"?: string,"delivery_enabled"?: boolean,"easypaisa_account_title"?: string | null,"easypaisa_number"?: string | null,"estimated_delivery_minutes"?: number,"free_delivery_threshold"?: number | null,"jazzcash_account_title"?: string | null,"jazzcash_number"?: string | null,"min_order_amount"?: number,"road_distance_factor"?: number,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Update: {
                    "bank_account_number"?: string | null,"bank_account_title"?: string | null,"bank_iban"?: string | null,"bank_name"?: string | null,"branch_id"?: string,"created_at"?: string,"delivery_enabled"?: boolean,"easypaisa_account_title"?: string | null,"easypaisa_number"?: string | null,"estimated_delivery_minutes"?: number,"free_delivery_threshold"?: number | null,"jazzcash_account_title"?: string | null,"jazzcash_number"?: string | null,"min_order_amount"?: number,"road_distance_factor"?: number,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "branch_settings_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: true
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"branches": {
                  Row: {
                    "address_en": string,"address_ur": string,"created_at": string,"id": string,"is_active": boolean,"last_order_number": number,"lat": number,"lng": number,"name_en": string,"name_ur": string,"order_prefix": string,"phone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_en": string,"address_ur"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"last_order_number"?: number,"lat": number,"lng": number,"name_en": string,"name_ur"?: string,"order_prefix": string,"phone": string,"updated_at"?: string
                  }
                  Update: {
                    "address_en"?: string,"address_ur"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"last_order_number"?: number,"lat"?: number,"lng"?: number,"name_en"?: string,"name_ur"?: string,"order_prefix"?: string,"phone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"call_attempts": {
                  Row: {
                    "created_at": string,"id": string,"order_id": string,"staff_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"order_id": string,"staff_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"order_id"?: string,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "call_attempts_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "call_attempts_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "branch_id": string,"created_at": string,"id": string,"is_active": boolean,"name_en": string,"name_ur": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name_en": string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name_en"?: string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"id": string,"is_blocked": boolean,"name": string,"phone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_blocked"?: boolean,"name": string,"phone": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_blocked"?: boolean,"name"?: string,"phone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"deal_items": {
                  Row: {
                    "branch_id": string,"created_at": string,"deal_item_id": string,"id": string,"item_id": string,"quantity": number,"updated_at": string,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"deal_item_id": string,"id"?: string,"item_id": string,"quantity": number,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"deal_item_id"?: string,"id"?: string,"item_id"?: string,"quantity"?: number,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deal_items_deal_item_id_branch_id_fkey"
      columns: ["deal_item_id","branch_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","branch_id"]
    },{
      foreignKeyName: "deal_items_item_id_branch_id_fkey"
      columns: ["item_id","branch_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","branch_id"]
    },{
      foreignKeyName: "deal_items_variant_id_item_id_fkey"
      columns: ["variant_id","item_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["id","item_id"]
    }
                  ]
                },"delivery_tiers": {
                  Row: {
                    "branch_id": string,"charge": number,"created_at": string,"id": string,"updated_at": string,"upper_km": number
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"charge": number,"created_at"?: string,"id"?: string,"updated_at"?: string,"upper_km": number
                  }
                  Update: {
                    "branch_id"?: string,"charge"?: number,"created_at"?: string,"id"?: string,"updated_at"?: string,"upper_km"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_tiers_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"discount_codes": {
                  Row: {
                    "branch_id": string,"code": string,"created_at": string,"ends_at": string | null,"first_order_only": boolean,"id": string,"is_active": boolean,"min_order": number,"one_per_phone": boolean,"starts_at": string | null,"type": Database["public"]['Enums']["discount_type"],"updated_at": string,"usage_limit": number | null,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"code": string,"created_at"?: string,"ends_at"?: string | null,"first_order_only"?: boolean,"id"?: string,"is_active"?: boolean,"min_order"?: number,"one_per_phone"?: boolean,"starts_at"?: string | null,"type": Database["public"]['Enums']["discount_type"],"updated_at"?: string,"usage_limit"?: number | null,"value": number
                  }
                  Update: {
                    "branch_id"?: string,"code"?: string,"created_at"?: string,"ends_at"?: string | null,"first_order_only"?: boolean,"id"?: string,"is_active"?: boolean,"min_order"?: number,"one_per_phone"?: boolean,"starts_at"?: string | null,"type"?: Database["public"]['Enums']["discount_type"],"updated_at"?: string,"usage_limit"?: number | null,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "discount_codes_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"item_addon_groups": {
                  Row: {
                    "branch_id": string,"group_id": string,"item_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"group_id": string,"item_id": string,"sort_order"?: number
                  }
                  Update: {
                    "branch_id"?: string,"group_id"?: string,"item_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_addon_groups_group_id_branch_id_fkey"
      columns: ["group_id","branch_id"]
isOneToOne: false
      referencedRelation: "addon_groups"
      referencedColumns: ["id","branch_id"]
    },{
      foreignKeyName: "item_addon_groups_item_id_branch_id_fkey"
      columns: ["item_id","branch_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","branch_id"]
    }
                  ]
                },"item_variants": {
                  Row: {
                    "branch_id": string,"created_at": string,"id": string,"is_available": boolean,"item_id": string,"name_en": string,"name_ur": string,"price": number,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"id"?: string,"is_available"?: boolean,"item_id": string,"name_en": string,"name_ur"?: string,"price": number,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"id"?: string,"is_available"?: boolean,"item_id"?: string,"name_en"?: string,"name_ur"?: string,"price"?: number,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_variants_item_id_branch_id_fkey"
      columns: ["item_id","branch_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","branch_id"]
    }
                  ]
                },"items": {
                  Row: {
                    "base_price": number,"branch_id": string,"category_id": string,"created_at": string,"description_en": string,"description_ur": string,"id": string,"image_path": string | null,"is_available": boolean,"is_deal": boolean,"is_featured": boolean,"is_hidden": boolean,"name_en": string,"name_ur": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price": number,"branch_id": string,"category_id": string,"created_at"?: string,"description_en"?: string,"description_ur"?: string,"id"?: string,"image_path"?: string | null,"is_available"?: boolean,"is_deal"?: boolean,"is_featured"?: boolean,"is_hidden"?: boolean,"name_en": string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "base_price"?: number,"branch_id"?: string,"category_id"?: string,"created_at"?: string,"description_en"?: string,"description_ur"?: string,"id"?: string,"image_path"?: string | null,"is_available"?: boolean,"is_deal"?: boolean,"is_featured"?: boolean,"is_hidden"?: boolean,"name_en"?: string,"name_ur"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_category_id_branch_id_fkey"
      columns: ["category_id","branch_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id","branch_id"]
    }
                  ]
                },"opening_hours": {
                  Row: {
                    "branch_id": string,"close_time": string,"created_at": string,"id": string,"is_closed": boolean,"open_time": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"close_time": string,"created_at"?: string,"id"?: string,"is_closed"?: boolean,"open_time": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "branch_id"?: string,"close_time"?: string,"created_at"?: string,"id"?: string,"is_closed"?: boolean,"open_time"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opening_hours_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"order_item_addons": {
                  Row: {
                    "addon_option_id": string | null,"created_at": string,"extra_price": number,"id": string,"name_en": string,"name_ur": string,"order_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_option_id"?: string | null,"created_at"?: string,"extra_price": number,"id"?: string,"name_en": string,"name_ur"?: string,"order_item_id": string
                  }
                  Update: {
                    "addon_option_id"?: string | null,"created_at"?: string,"extra_price"?: number,"id"?: string,"name_en"?: string,"name_ur"?: string,"order_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_addons_addon_option_id_fkey"
      columns: ["addon_option_id"]
isOneToOne: false
      referencedRelation: "addon_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_addons_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "created_at": string,"id": string,"item_id": string | null,"line_total": number,"name_en": string,"name_ur": string,"order_id": string,"quantity": number,"unit_price": number,"variant_id": string | null,"variant_name_en": string | null,"variant_name_ur": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item_id"?: string | null,"line_total": number,"name_en": string,"name_ur"?: string,"order_id": string,"quantity": number,"unit_price": number,"variant_id"?: string | null,"variant_name_en"?: string | null,"variant_name_ur"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item_id"?: string | null,"line_total"?: number,"name_en"?: string,"name_ur"?: string,"order_id"?: string,"quantity"?: number,"unit_price"?: number,"variant_id"?: string | null,"variant_name_en"?: string | null,"variant_name_ur"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_log": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": string,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_log_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "order_status_log_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_text": string,"branch_id": string,"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"customer_id": string,"customer_name": string,"customer_phone": string,"delivered_at": string | null,"delivery_charge": number,"discount_amount": number,"discount_code_id": string | null,"distance_km": number,"id": string,"landmark": string,"language": string,"lat": number,"lng": number,"notes": string,"order_number": number,"order_type": Database["public"]['Enums']["order_type"],"out_for_delivery_at": string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_status": Database["public"]['Enums']["payment_status"],"payment_verified_at": string | null,"payment_verified_by": string | null,"preparing_at": string | null,"rider_id": string | null,"status": Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_token": string,"transaction_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text": string,"branch_id": string,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"customer_id": string,"customer_name": string,"customer_phone": string,"delivered_at"?: string | null,"delivery_charge": number,"discount_amount"?: number,"discount_code_id"?: string | null,"distance_km": number,"id"?: string,"landmark"?: string,"language": string,"lat": number,"lng": number,"notes"?: string,"order_number": number,"order_type"?: Database["public"]['Enums']["order_type"],"out_for_delivery_at"?: string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_status"?: Database["public"]['Enums']["payment_status"],"payment_verified_at"?: string | null,"payment_verified_by"?: string | null,"preparing_at"?: string | null,"rider_id"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_token": string,"transaction_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_text"?: string,"branch_id"?: string,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"customer_id"?: string,"customer_name"?: string,"customer_phone"?: string,"delivered_at"?: string | null,"delivery_charge"?: number,"discount_amount"?: number,"discount_code_id"?: string | null,"distance_km"?: number,"id"?: string,"landmark"?: string,"language"?: string,"lat"?: number,"lng"?: number,"notes"?: string,"order_number"?: number,"order_type"?: Database["public"]['Enums']["order_type"],"out_for_delivery_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"],"payment_status"?: Database["public"]['Enums']["payment_status"],"payment_verified_at"?: string | null,"payment_verified_by"?: string | null,"preparing_at"?: string | null,"rider_id"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal"?: number,"total"?: number,"tracking_token"?: string,"transaction_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_discount_code_id_fkey"
      columns: ["discount_code_id"]
isOneToOne: false
      referencedRelation: "discount_codes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_payment_verified_by_fkey"
      columns: ["payment_verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "orders_rider_id_fkey"
      columns: ["rider_id"]
isOneToOne: false
      referencedRelation: "riders"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "branch_id": string | null,"created_at": string,"full_name": string,"is_active": boolean,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id"?: string | null,"created_at"?: string,"full_name": string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "branch_id"?: string | null,"created_at"?: string,"full_name"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"riders": {
                  Row: {
                    "branch_id": string,"created_at": string,"id": string,"is_active": boolean,"name": string,"phone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"phone": string,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"phone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "riders_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "cancel_reason": "customer_request"|"unreachable"|"unpaid_transfer"|"out_of_stock"|"other","discount_type": "percent"|"fixed","order_status": "pending_confirmation"|"confirmed"|"preparing"|"out_for_delivery"|"delivered"|"cancelled","order_type": "delivery","payment_method": "cod"|"bank_transfer"|"jazzcash"|"easypaisa","payment_status": "unpaid"|"paid"|"refund_due"|"refunded","user_role": "super_admin"|"order_staff"|"customer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cancel_reason": ["customer_request", "unreachable", "unpaid_transfer", "out_of_stock", "other"],"discount_type": ["percent", "fixed"],"order_status": ["pending_confirmation", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"],"order_type": ["delivery"],"payment_method": ["cod", "bank_transfer", "jazzcash", "easypaisa"],"payment_status": ["unpaid", "paid", "refund_due", "refunded"],"user_role": ["super_admin", "order_staff", "customer"]
          }
        }
} as const
