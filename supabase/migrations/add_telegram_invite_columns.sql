-- Migration: Add Telegram private invite tracking columns to profiles
-- Run this in your Supabase SQL editor to enable persistent channel invite gating

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_invite_link text,
  ADD COLUMN IF NOT EXISTS telegram_invite_claimed boolean DEFAULT false;
