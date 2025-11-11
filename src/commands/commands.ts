/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office, Word, console */

Office.onReady(() => {
  // If needed, Office.js is ready to be called.
  console.log("Office.js ready in commands.ts");
});

/**
 * Shows a notification when the add-in command is executed.
 * This is a placeholder function for Word ribbon commands.
 * @param event
 */
function action(event: Office.AddinCommands.Event) {
  // Perform some action with Word API
  Word.run(async (context) => {
    const body = context.document.body;
    body.insertParagraph("Command executed from Fishchi add-in!", Word.InsertLocation.end);
    await context.sync();

    console.log("Word command action performed");

    // Be sure to indicate when the add-in command function is complete.
    event.completed();
  }).catch((error) => {
    console.error("Error in command action:", error);
    event.completed();
  });
}

// Register the function with Office.
// This allows the function to be called from ribbon buttons defined in manifest.xml
Office.actions.associate("action", action);
