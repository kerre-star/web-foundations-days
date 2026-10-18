# Reflection

## The most difficult concept

The hardest concept for me was working with asynchronous code and APIs. At first I did not understand why a page could not simply wait for data, or why a request could fail in different ways: the network could drop, or the server could answer with an error like 404 while `fetch` still looked as if it had worked. I overcame it by building the same pattern again and again: `async` and `await`, a `try`, `catch` and `finally` block, and a check of `response.ok`. Writing one reusable `request()` function for my QuickNotes client made it click, because every GET, POST and DELETE followed the same steps. Showing loading, success and error messages also helped me see what the user experiences at each stage.

## What I would improve

Based on the feedback on my capstone, I would improve how the client handles a delete that is still waiting for the server. Right now only the clicked Delete button is disabled, so a user could start deleting other notes at the same time. I would add a "pending" style that dims the note being deleted and disables the other buttons until the server answers. I would also keep applying feedback from earlier days, such as styling with selector specificity instead of `!important`, and adding `ON DELETE CASCADE` to my database tables.

## What I will learn next

Next I want to build a real backend, so that my front end talks to my own API and a real database instead of a practice API. I plan to learn a server framework, authentication and how to deploy an app, and to put into practice ideas from my design documents, such as caching and the transactions that prevent double-booking.