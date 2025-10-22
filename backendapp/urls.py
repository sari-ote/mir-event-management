# ===========================================
# Import all functions from existing routers
# ===========================================

from fastapi import APIRouter

# Import from auth router
from app.auth.router import register, login_user

# Import from events router  
from app.events.router import create_event, get_my_events, get_event, update_event, delete_event

# Import from guests router
from app.guests.router import (
    create_guest, update_guest, delete_guest, get_guests, get_all_guests,
    filter_guests, export_guests_to_excel, export_guests_to_pdf, export_seating_image,
    create_custom_field, get_custom_fields, delete_custom_field,
    create_field_value, get_field_values, add_field_value, get_guests_with_fields,
    update_guests_with_default_gender_endpoint, create_form_field, list_form_fields, reorder_form_fields
)

# Import from tables router
from app.tables.router import (
    create, get_all, get_one, update, delete,
    get_by_event, bulk_create_tables, add_single_table, remove_single_table,
    create_hall_element_endpoint, get_hall_elements, update_hall_element_endpoint, delete_hall_element_endpoint
)

# Import from users router
from app.users.router import create_user, get_all_users, get_user, delete_user

# Import from seatings router
from app.seatings.router import (
    assign_seat, get_seatings, delete_seating, update_seating, save_seating_plan,
    export_seating_map, export_guest_list, get_seating_statistics,
    delete_seating_cards, generate_seating_cards, get_seating_cards,
    download_seating_card, download_all_cards, export_seating_map_filtered,
    export_seating_map_filtered_pdf, get_filter_options
)

# Import from permissions router
from app.permissions.router import (
    create as create_permission, get_by_user, get_by_event as get_permissions_by_event,
    delete as delete_permission, update_permission
)

# Import from tableHead router
from app.tableHead.router import (
    create_table_head, get_table_heads_by_event, delete_table_head, update_table_head
)

# Import from audit_log router
from app.audit_log.router import get_audit_log, get_all_audit_logs

# Import from greetings router
from app.greetings.router import (
    create_greeting, get_greeting, get_greetings_by_event, get_greeting_by_guest,
    update_greeting, delete_greeting, approve_greeting, get_approved_greetings_by_event
)

# Import from bot router
from app.bot.router import (
    get_event_info_for_bot, get_confirmed_guests_for_bot, register_guest_via_bot,
    get_guest_info_for_bot, create_greeting_via_bot, get_guest_greeting,
    get_event_greetings_for_bot, get_upcoming_reminders, get_week_before_reminders,
    mark_notification_sent, mark_reminder_sent, get_event_notification_data,
    get_guest_ticket, get_event_tickets, confirm_guest_arrival,
    get_event_custom_fields, get_guest_custom_fields, set_guest_custom_field
)

# Import from payments router
from app.payments.router import (
    get_nedarim_plus_config, create_payment, get_event_payments,
    get_payment, nedarim_plus_webhook_regular, nedarim_plus_webhook_keva,
    update_payment
)

# Import from realtime router
from app.realtime.router import (
    websocket_endpoint, scan_qr_code, get_realtime_notifications,
    mark_notification_read, fix_seating_status
)
# Create main router
router = APIRouter()

# ===========================================
# Include all imported functions in router
# ===========================================

# Authentication & Users
router.add_api_route("/auth/register", register, methods=["POST"])
router.add_api_route("/auth/login", login_user, methods=["POST"])
router.add_api_route("/users/", get_all_users, methods=["GET"])
router.add_api_route("/users/", create_user, methods=["POST"])
router.add_api_route("/users/{user_id}", get_user, methods=["GET"])
router.add_api_route("/users/{user_id}", delete_user, methods=["DELETE"])

# Events
router.add_api_route("/events/", create_event, methods=["POST"])
router.add_api_route("/events/", get_my_events, methods=["GET"])
router.add_api_route("/events/{event_id}", get_event, methods=["GET"])
router.add_api_route("/events/{event_id}", update_event, methods=["PUT"])
router.add_api_route("/events/{event_id}", delete_event, methods=["DELETE"])

# Guests
router.add_api_route("/guests/", create_guest, methods=["POST"])
router.add_api_route("/guests/{guest_id}", update_guest, methods=["PUT"])
router.add_api_route("/guests/{guest_id}", delete_guest, methods=["DELETE"])
router.add_api_route("/guests/event/{event_id}", get_guests, methods=["GET"])
router.add_api_route("/guests/", get_all_guests, methods=["GET"])
router.add_api_route("/guests/filter", filter_guests, methods=["GET"])
router.add_api_route("/guests/export", export_guests_to_excel, methods=["GET"])
router.add_api_route("/guests/export-pdf", export_guests_to_pdf, methods=["GET"])
router.add_api_route("/guests/export-seating-image", export_seating_image, methods=["GET"])
router.add_api_route("/guests/custom-field/", create_custom_field, methods=["POST"])
router.add_api_route("/guests/custom-field/{event_id}", get_custom_fields, methods=["GET"])
router.add_api_route("/guests/custom-field/{field_id}", delete_custom_field, methods=["DELETE"])
router.add_api_route("/guests/field-value/", create_field_value, methods=["POST"])
router.add_api_route("/guests/field-value/{guest_id}", get_field_values, methods=["GET"])
router.add_api_route("/events/{event_id}/guests/{guest_id}/field-values", add_field_value, methods=["POST"])
router.add_api_route("/guests/event/{event_id}/with-fields", get_guests_with_fields, methods=["GET"])
router.add_api_route("/guests/update-gender-defaults/{event_id}", update_guests_with_default_gender_endpoint, methods=["POST"])
router.add_api_route("/guests/events/{event_id}/form-fields", create_form_field, methods=["POST"])
router.add_api_route("/guests/events/{event_id}/form-fields", list_form_fields, methods=["GET"])
router.add_api_route("/guests/events/{event_id}/form-fields/reorder", reorder_form_fields, methods=["POST"])

# Tables
router.add_api_route("/tables/", create, methods=["POST"])
router.add_api_route("/tables/", get_all, methods=["GET"])
router.add_api_route("/tables/{table_id}", get_one, methods=["GET"])
router.add_api_route("/tables/{table_id}", update, methods=["PUT"])
router.add_api_route("/tables/{table_id}", delete, methods=["DELETE"])
router.add_api_route("/tables/event/{event_id}", get_by_event, methods=["GET"])
router.add_api_route("/tables/event/{event_id}/bulk", bulk_create_tables, methods=["POST"])
router.add_api_route("/tables/event/{event_id}/add-single", add_single_table, methods=["POST"])
router.add_api_route("/tables/event/{event_id}/remove-single/{table_number}", remove_single_table, methods=["DELETE"])
router.add_api_route("/tables/hall-elements/event/{event_id}", create_hall_element_endpoint, methods=["POST"])
router.add_api_route("/tables/hall-elements/event/{event_id}", get_hall_elements, methods=["GET"])
router.add_api_route("/tables/hall-elements/{element_id}", update_hall_element_endpoint, methods=["PUT"])
router.add_api_route("/tables/hall-elements/{element_id}", delete_hall_element_endpoint, methods=["DELETE"])

# Table Heads
router.add_api_route("/table-heads/", create_table_head, methods=["POST"])
router.add_api_route("/table-heads/event/{event_id}", get_table_heads_by_event, methods=["GET"])
router.add_api_route("/table-heads/{table_head_id}", delete_table_head, methods=["DELETE"])
router.add_api_route("/table-heads/{table_head_id}", update_table_head, methods=["PUT"])

# Add the /tables/table-heads/ endpoints for frontend compatibility
router.add_api_route("/tables/table-heads/", create_table_head, methods=["POST"])
router.add_api_route("/tables/table-heads/event/{event_id}", get_table_heads_by_event, methods=["GET"])
router.add_api_route("/tables/table-heads/{table_head_id}", delete_table_head, methods=["DELETE"])
router.add_api_route("/tables/table-heads/{table_head_id}", update_table_head, methods=["PUT"])

# Seatings
router.add_api_route("/seatings/", assign_seat, methods=["POST"])
router.add_api_route("/seatings/event/{event_id}", get_seatings, methods=["GET"])
router.add_api_route("/seatings/{seating_id}", delete_seating, methods=["DELETE"])
router.add_api_route("/seatings/{seating_id}", update_seating, methods=["PUT"])
router.add_api_route("/seatings/save-seating-plan", save_seating_plan, methods=["POST"])
router.add_api_route("/seatings/export-seating-map/{event_id}", export_seating_map, methods=["GET"])
router.add_api_route("/seatings/export-guest-list/{event_id}", export_guest_list, methods=["GET"])
router.add_api_route("/seatings/seating-statistics/{event_id}", get_seating_statistics, methods=["GET"])
router.add_api_route("/seatings/cards/{event_id}", delete_seating_cards, methods=["DELETE"])
router.add_api_route("/seatings/generate-cards/{event_id}", generate_seating_cards, methods=["POST"])
router.add_api_route("/seatings/cards/{event_id}", get_seating_cards, methods=["GET"])
router.add_api_route("/seatings/card/{card_id}/download", download_seating_card, methods=["GET"])
router.add_api_route("/seatings/cards/{event_id}/download-all", download_all_cards, methods=["GET"])
router.add_api_route("/seatings/export-seating-map-filtered/{event_id}", export_seating_map_filtered, methods=["GET"])
router.add_api_route("/seatings/export-seating-map-filtered-pdf/{event_id}", export_seating_map_filtered_pdf, methods=["GET"])
router.add_api_route("/seatings/filter-options/{event_id}", get_filter_options, methods=["GET"])

# Greetings
router.add_api_route("/greetings/", create_greeting, methods=["POST"])
router.add_api_route("/greetings/{greeting_id}", get_greeting, methods=["GET"])
router.add_api_route("/greetings/event/{event_id}", get_greetings_by_event, methods=["GET"])
router.add_api_route("/greetings/guest/{guest_id}", get_greeting_by_guest, methods=["GET"])
router.add_api_route("/greetings/{greeting_id}", update_greeting, methods=["PUT"])
router.add_api_route("/greetings/{greeting_id}", delete_greeting, methods=["DELETE"])
router.add_api_route("/greetings/{greeting_id}/approve", approve_greeting, methods=["POST"])
router.add_api_route("/greetings/event/{event_id}/approved", get_approved_greetings_by_event, methods=["GET"])

# Real-time
router.add_api_route("/realtime/ws/{event_id}", websocket_endpoint, methods=["GET"])  # WebSocket
router.add_api_route("/realtime/scan-qr", scan_qr_code, methods=["POST"])
router.add_api_route("/realtime/notifications/{event_id}", get_realtime_notifications, methods=["GET"])
router.add_api_route("/realtime/notifications/{notification_id}/mark-read", mark_notification_read, methods=["POST"])
router.add_api_route("/realtime/fix-seating-status/{event_id}", fix_seating_status, methods=["POST"])

# Permissions
router.add_api_route("/permissions/", create_permission, methods=["POST"])
router.add_api_route("/permissions/user/{user_id}", get_by_user, methods=["GET"])
router.add_api_route("/permissions/event/{event_id}", get_permissions_by_event, methods=["GET"])
router.add_api_route("/permissions/{permission_id}", delete_permission, methods=["DELETE"])
router.add_api_route("/permissions/{permission_id}", update_permission, methods=["PUT"])

# Audit Log
router.add_api_route("/audit-log/", get_audit_log, methods=["GET"])
router.add_api_route("/audit-log/all", get_all_audit_logs, methods=["GET"])

# Bot Integration
router.add_api_route("/bot/event/{event_id}", get_event_info_for_bot, methods=["GET"])
router.add_api_route("/bot/guests/confirmed/{event_id}", get_confirmed_guests_for_bot, methods=["GET"])
router.add_api_route("/bot/guest/register", register_guest_via_bot, methods=["POST"])
router.add_api_route("/bot/guest/{guest_id}/info", get_guest_info_for_bot, methods=["GET"])
router.add_api_route("/bot/greeting", create_greeting_via_bot, methods=["POST"])
router.add_api_route("/bot/greeting/{guest_id}", get_guest_greeting, methods=["GET"])
router.add_api_route("/bot/event/{event_id}/greetings", get_event_greetings_for_bot, methods=["GET"])
router.add_api_route("/bot/reminders/upcoming", get_upcoming_reminders, methods=["GET"])
router.add_api_route("/bot/reminders/week-before", get_week_before_reminders, methods=["GET"])
router.add_api_route("/bot/notification/sent", mark_notification_sent, methods=["POST"])
router.add_api_route("/bot/reminder/sent", mark_reminder_sent, methods=["POST"])
router.add_api_route("/bot/event/{event_id}/notification-data", get_event_notification_data, methods=["GET"])
router.add_api_route("/bot/guest/{guest_id}/ticket", get_guest_ticket, methods=["GET"])
router.add_api_route("/bot/event/{event_id}/tickets", get_event_tickets, methods=["GET"])
router.add_api_route("/bot/guest/{guest_id}/confirm-arrival", confirm_guest_arrival, methods=["POST"])
router.add_api_route("/bot/event/{event_id}/custom-fields", get_event_custom_fields, methods=["GET"])
router.add_api_route("/bot/guest/{guest_id}/custom-fields", get_guest_custom_fields, methods=["GET"])
router.add_api_route("/bot/guest/{guest_id}/custom-field", set_guest_custom_field, methods=["POST"])

# Payments & Nedarim Plus Integration
router.add_api_route("/payments/config", get_nedarim_plus_config, methods=["GET"])
router.add_api_route("/payments", create_payment, methods=["POST"])
router.add_api_route("/payments/event/{event_id}", get_event_payments, methods=["GET"])
router.add_api_route("/payments/{payment_id}", get_payment, methods=["GET"])
router.add_api_route("/payments/{payment_id}", update_payment, methods=["PATCH"])
router.add_api_route("/payments/webhook/nedarim-plus/regular", nedarim_plus_webhook_regular, methods=["POST"])
router.add_api_route("/payments/webhook/nedarim-plus/keva", nedarim_plus_webhook_keva, methods=["POST"])


