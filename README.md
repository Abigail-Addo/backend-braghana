# BRAGHANA APP – BACKEND DEVELOPMENT

## PHASE 1

### 1. Database and Architecture

- [X] **Design database schema and backend architecture**

### 2. Authentication and Authorization

- [X] **Signup (POST):** Register users with fullname and phone; send otp to users via text message
- [X] **Login (POST):** Authenticate users using otp and phone and provide tokens
- [X] **Profile Update (PUT):** Allow authenticated users to update personal information

### 3. Post Management

- [X] **Add Post (POST):** Upload images, videos, or text
- [X] **View Posts:**
  - [X] **All Posts (GET):** Retrieve all posts in the feed
  - [X] **Single Post (GET):** Retrieve a specific post
- [X] **Update Post (PUT):** Edit content of an existing post
- [X] **Delete Post (DELETE):** Remove a specific post
- [X] **Mute Post/User (PUT):** Temporarily hide a post or user in the feed
- [X] **Report Post (POST):** Flag inappropriate content

### 4. Event Management

- [X] **Add Event (POST):** Allow users to create events
- [X] **View Events (GET):** Filter events by category (All, Paid, Free) or location
- [X] **Save Event (POST):** Bookmark an event for later
- [X] **Update Event (PUT):** Edit event details
- [X] **Delete/Mute Event (DELETE):** Remove or hide an event

### 5. Product Management

- [X] **Add Product (POST):** Upload product listings
- [X] **View Products:**
  - [X] **All Products (GET):** Retrieve all product listings
  - [X] **Single Product (GET):** Retrieve a single product
- [X] **Update Product (PUT):** Edit product information
- [X] **Delete Product (DELETE):** Remove a product listing

### 6. Interactions

- [X] **Reactions:**
  - [X] **Add Reaction (POST):** Like or react to posts
  - [X] **Remove Reaction (DELETE):** Undo a reaction
- [X] **Comments:**
  - [X] **Add Comment (POST):** Comment on a post
  - [X] **Delete Comment (DELETE):** Remove a comment from your post
  - [X] **Delete Comment (DELETE):** Remove your own comment
- [X] **Follow User:**
  - [X] **Follow (POST):** Follow another user
  - [X] **Unfollow (DELETE):** Undo a follow

### 7. Notifications and Analytics

- [X] **View Notifications (GET):** Retrieve all notifications for a user
- [X] **Post Analytics:**
  - [X] **Views (GET):** Count of post views
  - [X] **Reactions (GET):** Count of reactions
  - [X] **Comments (GET):** Count of comments
  - [X] **Saves (GET):** Count of saved posts

### 8. In-App Messaging

- [X] **Messages:** Enable direct messaging between users

### 9. Forms and Reports

- [X] **Enquiry Form:**
  - [X] **Submit Enquiry (POST):** Allows users to send enquiries or feedback to the support team
- [X] **Contact Us Form:**
  - [X] **Submit Contact Request (POST):** Allows users to contact the company for general inquiries or partnerships
- [X] **Report Section:**
  - [X] **Report User (POST):** Enables users to report inappropriate behaviours or profiles
  - [X] **Report Post (POST):** Allows users to flag posts for review

### 10. Other Features

- [X] **Commercials/Ads (GET):** View promoted content
- [X] **Newsletter Subscription (POST):** Subscribe to newsletters

## Local Setup

### Prerequisite

    - Nodejs installed
    - Postgres installed
    - Pgadmin installed
    - Nats installed

* clone the repository
* you should have postgres locally setup and running if you want to access the data locally. and connected to pgadmin
* cd into each microservice and run `npm install --legacy-peer-deps ` to install dependencies
* run `npx prisma generate`
* run `npx prisma migrate dev --name init`
* in the terminal run `nats-server` to start nats server
* start the gateway api first then you can start any of the microservice to start testing the api
* cd into a microservice to start a microservice run `npm run start:dev`

### Environment variables

create a .env for each microservice and add the following

replace users_db with the respective microservice db. check the docker compose file to get the name of the dbs for each microservice

DATABASE_URL="postgresql://postgres:`<password>`@localhost:5432/users_db?schema=public"

JWT_SECRET=890f3222-KR613WMB47007082028728323f7b-56ce-8cf7-7d53393b9ac3

JWT_ACCESS_TOKEN_TTL=3600  //1hour

JWT_REFRESH_TOKEN_TTL= 86400, // Refresh token expires in 24 hours

JWT_TOKEN_ISSUER='braghana'

JWT_TOKEN_AUDIENCE='braghana'

PORT=3000

CLOUDINARY_CLOUD_NAME="yours_here"

CLOUDINARY_API_KEY="your_key_here"

CLOUDINARY_API_SECRET="your_secret_here"

TWILIO_ACCOUNT_SID=

TWILIO_AUTH_TOKEN=

TWILIO_PHONE_NUMBER=


.env for payment microservice

PAYSTACK_SECRET_KEY=

PAYSTACK_PUBLIC_KEY=
