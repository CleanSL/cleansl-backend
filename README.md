Clean SL Backend

Backend services for the Clean SL waste management platform.
This backend handles authentication, database management, and API communication between the mobile/web applications and the database using Supabase.

Overview

Clean SL is a smart waste collection system designed to connect Residents and Drivers for efficient garbage collection scheduling and tracking.

The backend is built using Supabase, which provides:

PostgreSQL database

Authentication services

API layer

Row Level Security (RLS)

Real-time data support

Authentication

Authentication is handled using Supabase Auth.

Two main user roles are supported:

Residents

Drivers

Users register and log in through Supabase authentication using email and password.

After authentication, user details are stored in corresponding tables.

Database Schema

The Supabase database contains the following main tables related to login and user management.

residents

Stores information about users who request waste collection services.

Example fields:

id – UUID (linked with Supabase Auth user id)

name

email

phone_number

address

created_at

drivers

Stores information about drivers responsible for waste collection.

Example fields:

id – UUID (linked with Supabase Auth user id)

name

email

phone_number

vehicle_number

created_at

How Login Works

User signs up using Supabase Auth.

Supabase generates a unique user ID (UUID).

That ID is stored in the residents or drivers table depending on the user type.

The frontend uses the Supabase session token to access protected APIs.
