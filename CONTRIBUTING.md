# Contributing to GenLayerJS SDK

We're thrilled that you're interested in contributing to the GenLayerJS SDK! This document will guide you through the contribution process.

## What is the GenLayerJS SDK?

The GenLayerJS SDK is a TypeScript library designed for developers building decentralized applications (Dapps) on the GenLayer protocol. It provides a comprehensive set of tools to interact with the GenLayer network, including client creation, transaction handling, event subscriptions, and more, all while leveraging the power of Viem as the underlying blockchain client.

## How You Can Contribute?

Contributions to the GenLayerJS SDK are welcome in several forms:

### Testing the SDK and Providing Feedback

Help us make the SDK better by testing and giving feedback:

- Start by installing the SDK in your Dapp using the command:
  ```sh
  $ npm install genlayer-js
  ```
- Try out the SDK features and tell us what you think through our [feedback form](https://docs.google.com/forms/d/1IVNsZwm936kSNCiXmlAP8bgJnbik7Bqaoc3I6UYhr-o/viewform) or on our [Discord Channel](https://discord.gg/8Jm4v89VAu).
- If you find any issues, please report them on our [GitHub issues page](https://github.com/yeagerai/genlayer-js/issues).

### Sharing New Ideas and Use Cases

Have ideas for new features or use cases? We're eager to hear them! But first:

- Ensure you have the SDK installed to explore existing use cases.
- After familiarizing yourself with the SDK, contribute your unique use case and share your ideas in our [Discord channel](https://discord.gg/8Jm4v89VAu).

### Bug fixing and Feature development

#### 1. Set yourself up to start coding

- **1.1. Pick an issue**: Select one from the project GitHub repository [issue list](https://github.com/yeagerai/genlayer-js/issues) and assign it to yourself.

- **1.2. Create a branch**: create the branch that you will work on by using the link provided in the issue details page (right panel at the bottom - section "Development")

- **1.3. Setup the SDK locally**: clone the repository and install dependencies

   ```sh
   $ git clone https://github.com/yeagerai/genlayer-js.git
   $ cd genlayer-js
   $ npm install
   ```

- **1.4. Run the SDK in dev mode**: to run the SDK in development mode with hot reload enabled:

   ```sh
   $ npm run build:watch
   ```
- **1.5. Link the package locally**: to link the package locally, use the command:

   ```sh
   $ npm link
   ```

This will allow you to use the package in your project without publishing it.

- **1.6. Add the package to your project**: to add the package to your project, use the command:

   ```sh
   $ npm link genlayer-js
   ```

#### 2. Submit your solution

- **2.1. Prettier Formatter on Save File**: Configure IDE extensions to format your code with [Prettier](https://prettier.io/) before submitting it.
- **2.2. Code solution**: implement the solution in the code.
- **2.3. Pull Request**: Submit your changes through a pull request (PR). Fill the entire PR template and set the PR title as a valid conventional commit.
- **2.4. Check PR and issue linking**: if the issue and the PR are not linked, you can do it manually in the right panel of the Pull Request details page.  
- **2.5. Peer Review**: One or more core contributors will review your PR. They may suggest changes or improvements.
- **2.6. Approval and Merge**: After approval from the reviewers, you can merge your PR with a squash and merge type of action.


### Improving Documentation

To contribute to our docs, visit our [Documentation Repository](https://github.com/yeagerai/genlayer-docs) to create new issues or contribute to existing issues.

## Community

Connect with the GenLayer community to discuss, collaborate, and share insights:

- **[Discord Channel](https://discord.gg/8Jm4v89VAu)**: Our primary hub for discussions, support, and announcements.
- **[Telegram Group](https://t.me/genlayer)**: For more informal chats and quick updates.

Your continuous feedback drives better product development. Please engage with us regularly to test, discuss, and improve the GenLayerJS SDK.