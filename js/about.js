// ============================================================
// about.js - the About page only needs login + the shared header
// ============================================================
import { requireLogin } from "./auth.js";
import { setupHeader } from "./header.js";

const { profile } = await requireLogin();
setupHeader(profile);