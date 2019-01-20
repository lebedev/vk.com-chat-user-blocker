// ==UserScript==
// @name        VK.com chat user blocker
// @namespace   vk_com_chat_user_blocker
// @author      Angly Cat
// @description Allows blocking users in vk.com chats.
// @include     https://vk.com/*
// @version     1
// @grant       none
// ==/UserScript==

(() => {
  let debounceTimeoutId;
  function scheduleProcessing() {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = setTimeout(process, 100);
  }
  
  const aliasesSet = new Set();
  
  function toggleBlock() {
    const stack = (() => {
      let node = this;
      while(!node.classList.contains('im-mess-stack')) {
        node = node.parentNode;
      }
      return node;
    })();
    
    const peerId = stack.dataset.peer;
    
    let blockedUsers;
    try {
      blockedUsers = {};
      blockedUsers = JSON.parse(localStorage.blockedUsers || '{}');
    } catch(e) {}
    
    if (blockedUsers[peerId]) {
      const shouldUnblock = confirm(`${blockedUsers[peerId]} will be unblocked with the page reloading. Continue?`);
      if (shouldUnblock) {
        delete blockedUsers[peerId];
        localStorage.blockedUsers = JSON.stringify(blockedUsers);
        location.reload();
      }
    } else {
      const name = stack.querySelector('.im-mess-stack--lnk').textContent;
      const shouldBlock = confirm(`${name} will be blocked. Continue?`);
      if (shouldBlock) {
        blockedUsers[peerId] = name;
        localStorage.blockedUsers = JSON.stringify(blockedUsers);
        scheduleProcessing();
      }
    }
  }
  
  function addToggleBlockButton(stack) {
    stack.classList.add('with-toggle-block-button');
    const actions = stack.querySelector('.im-mess--actions');
    actions.insertAdjacentHTML('afterbegin', '<span role="link" aria-label="Reply" class="im-mess--reply _im_mess_spam"></span>');
    const toggleBlockButton = actions.querySelector('._im_mess_spam');
    toggleBlockButton.onclick = toggleBlock;
  }
  
  function purifyStackHeader(stack) {
    if (stack.classList.contains('processed')) {
      return;
    }

    stack.classList.add('processed');

    const avatarLink = stack.querySelector('.im_grid');
    aliasesSet.add(avatarLink.href);
    avatarLink.href = '#';
    
    const avatar = avatarLink.querySelector('img');
    avatar.alt = 'Blocked user';
    avatar.src = '/images/camera_50.png?ava=1';
    
    const nameLink = stack.querySelector('.im-mess-stack--lnk');
    nameLink.href = '#';
    nameLink.textContent = 'Blocked user';
  }
  
  function purifyStackContent(stack) {
    const removedMessage = stack.querySelector('.im-mess-stack--content > .im-mess-stack--mess > .im-mess');
    if (!removedMessage.classList.contains('processed')) {
      removedMessage.classList.add('processed');
      removedMessage.querySelector('.im-mess--text').textContent = 'Message removed.';
    }
    const messagesToRemove = stack.querySelectorAll('.im-mess-stack--content > .im-mess-stack--mess > .im-mess:not(.processed)');
    messagesToRemove.forEach((message) => message.remove());
  }
  
  function fillDataPeer(stack) {
    const messageWithPeer = stack.querySelector('.im-mess');
    stack.dataset.peer = messageWithPeer.dataset.peer;
  }
  
  function purifyReplyLinks(link) {
    link.href = '#';
    link.textContent;
    
    link.parentNode.querySelector('.im-replied--text').textContent = 'Message removed.';
  }
  
  function process() {
    console.log('process');
    const chat = document.querySelector('._im_peer_history');

    const stacksWithoutBlockButton = chat.querySelectorAll('._im_peer_history > .im-mess-stack:not(.with-toggle-block-button)');
    stacksWithoutBlockButton.forEach(addToggleBlockButton);
    
    let blockedUsers;
    try {
      blockedUsers = {};
      blockedUsers = JSON.parse(localStorage.blockedUsers || '{}');
    } catch(e) {}
    
    const stacksWithoutDataPeer = chat.querySelectorAll('.im-mess-stack:not(.processed)[data-peer="0"]');
    stacksWithoutDataPeer.forEach(fillDataPeer)

    Object.keys(blockedUsers).forEach((peerId) => {
      const corruptedStacks = chat.querySelectorAll(`._im_peer_history .im-mess-stack[data-peer="${peerId}"]`);
      corruptedStacks.forEach(purifyStackHeader);
      corruptedStacks.forEach(purifyStackContent);
    });
    
    const corruptedReplyLinks = chat.querySelectorAll([...aliasesSet].map((alias) => `.im-replied--author-link[href="${alias}"]`));
    corruptedReplyLinks.forEach(purifyReplyLinks);
  }
 
  const observer = new MutationObserver(scheduleProcessing);
 
  function attach() {
    const chat = document.querySelector('._im_peer_history');
    if (!chat) {
      observer.disconnect();
    } else if (!chat.isUserBlockerAttached) {
      chat.isUserBlockerAttached = true;

      observer.disconnect();

      scheduleProcessing();

      observer.observe(chat, { attributes: true, childList: true, subtree: true });
    }
    
    if (!window.toggleBlockButtonStyle) {
      document.head.insertAdjacentHTML('beforeend', `<style id="toggleBlockButtonStyle">
        ._im_mess_spam {
          background: url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22%23828A99%22%20d%3D%22M4.6%2012.9c.9.7%202.1%201.1%203.4%201.1%203.3%200%206-2.7%206-6%200-1.3-.4-2.5-1.1-3.4l-8.3%208.3zm-1.5-1.5l8.4-8.4c-1-.6-2.2-1-3.5-1-3.3%200-6%202.7-6%206%200%201.3.4%202.5%201.1%203.4zm4.9%204.6c-4.4%200-8-3.6-8-8s3.6-8%208-8%208%203.6%208%208-3.6%208-8%208z%22%2F%3E%3C%2Fsvg%3E') 5px 5px no-repeat !important;
        }
      </style>`);
    }
  }

  (() => {
    let previousLocation = location.toString();
    setInterval(() => {
      if (previousLocation !== location.toString()) {
        previousLocation = location.toString();
        attach();
      }
    }, 100);
  })();

  attach();
})();
