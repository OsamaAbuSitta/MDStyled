
  /* ═══════════════════════════════════════
     Emoji
     ═══════════════════════════════════════ */

  /* A curated set rather than the full Unicode table: enough to cover what people
     reach for in a document, small enough to ship inside the template. Each entry is
     [character, searchable words] - the first word doubles as the `:shortcode:`. */
  var EMOJI_GROUPS = [
    {
      name: 'Smileys',
      items: [
        ['😀', 'grinning smile happy'], ['😃', 'smiley happy'], ['😄', 'grin happy'],
        ['😁', 'beaming grin'], ['😆', 'laughing satisfied'], ['😅', 'sweat_smile relief'],
        ['🤣', 'rofl rolling laughing'], ['😂', 'joy tears laughing'], ['🙂', 'slight_smile'],
        ['🙃', 'upside_down silly'], ['😉', 'wink'], ['😊', 'blush smile'],
        ['😍', 'heart_eyes love'], ['🥰', 'smiling_hearts love'], ['😘', 'kiss'],
        ['🤔', 'thinking hmm'], ['🤨', 'raised_eyebrow doubt'], ['😐', 'neutral'],
        ['🙄', 'roll_eyes'], ['😏', 'smirk'], ['😴', 'sleeping zzz'],
        ['🤯', 'exploding_head mind blown'], ['🤗', 'hugs'], ['🤭', 'hand_over_mouth oops'],
        ['🤫', 'shushing quiet'], ['😬', 'grimacing awkward'], ['😌', 'relieved calm'],
        ['😔', 'pensive sad'], ['😢', 'cry sad'], ['😭', 'sob crying'],
        ['😤', 'triumph huff'], ['😠', 'angry'], ['😡', 'rage furious'],
        ['😳', 'flushed surprised'], ['🥵', 'hot'], ['🥶', 'cold freezing'],
        ['😱', 'scream fear'], ['😰', 'anxious worried'], ['🤒', 'sick ill'],
        ['🤓', 'nerd glasses'], ['😎', 'sunglasses cool'], ['🥳', 'partying celebrate']
      ]
    },
    {
      name: 'People',
      items: [
        ['👍', 'thumbsup yes approve good'], ['👎', 'thumbsdown no reject bad'],
        ['👌', 'ok perfect'], ['✌️', 'victory peace'], ['🤞', 'crossed_fingers luck'],
        ['🙏', 'pray thanks please'], ['👏', 'clap applause'], ['🙌', 'raised_hands praise'],
        ['💪', 'muscle strong'], ['👀', 'eyes look watch'], ['🤝', 'handshake deal agree'],
        ['👋', 'wave hello hi bye'], ['✍️', 'writing write'], ['🧠', 'brain think'],
        ['🫶', 'heart_hands love'], ['🤷', 'shrug dunno'], ['🧑‍💻', 'technologist developer coder'],
        ['👤', 'user person'], ['👥', 'users people team'], ['🗣️', 'speaking talk']
      ]
    },
    {
      name: 'Nature',
      items: [
        ['🌱', 'seedling grow new'], ['🌿', 'herb leaf'], ['🍀', 'clover luck'],
        ['🌲', 'evergreen tree'], ['🌳', 'tree'], ['🌸', 'blossom flower'],
        ['🌻', 'sunflower'], ['🌞', 'sun day'], ['🌙', 'moon night'],
        ['⭐', 'star'], ['🌟', 'glowing_star sparkle'], ['✨', 'sparkles magic new'],
        ['⚡', 'zap lightning fast'], ['🔥', 'fire hot flame'], ['💧', 'droplet water'],
        ['🌊', 'wave ocean'], ['❄️', 'snowflake cold'], ['☁️', 'cloud'],
        ['🌈', 'rainbow'], ['🐛', 'bug defect'], ['🐝', 'bee'], ['🦋', 'butterfly'],
        ['🐞', 'ladybug bug'], ['🐧', 'penguin linux'], ['🐢', 'turtle slow'],
        ['🐳', 'whale docker'], ['🐍', 'snake python'], ['🦀', 'crab rust']
      ]
    },
    {
      name: 'Food',
      items: [
        ['🍎', 'apple'], ['🍊', 'tangerine orange'], ['🍋', 'lemon'], ['🍌', 'banana'],
        ['🍉', 'watermelon'], ['🍇', 'grapes'], ['🍓', 'strawberry'], ['🍒', 'cherries'],
        ['🥑', 'avocado'], ['🍅', 'tomato'], ['🥕', 'carrot'], ['🌽', 'corn'],
        ['🍞', 'bread'], ['🧀', 'cheese'], ['🍔', 'burger'], ['🍟', 'fries'],
        ['🍕', 'pizza'], ['🌮', 'taco'], ['🍣', 'sushi'], ['🍜', 'ramen noodles'],
        ['🍰', 'cake slice'], ['🎂', 'birthday cake'], ['🍩', 'doughnut'], ['🍪', 'cookie'],
        ['☕', 'coffee tea'], ['🍵', 'green_tea'], ['🍺', 'beer'], ['🥂', 'cheers toast']
      ]
    },
    {
      name: 'Objects',
      items: [
        ['💻', 'laptop computer'], ['🖥️', 'desktop screen'], ['⌨️', 'keyboard'],
        ['📱', 'phone mobile'], ['📷', 'camera photo'], ['🎥', 'video movie'],
        ['💡', 'bulb idea'], ['🔦', 'flashlight'], ['🔋', 'battery'], ['🔌', 'plug'],
        ['🧰', 'toolbox tools'], ['🔧', 'wrench fix'], ['🔨', 'hammer build'],
        ['⚙️', 'gear settings config'], ['🧲', 'magnet'], ['🔍', 'search find magnify'],
        ['🔒', 'lock secure'], ['🔓', 'unlock open'], ['🔑', 'key'],
        ['📎', 'paperclip attach'], ['📌', 'pushpin pin'], ['📍', 'location place'],
        ['✂️', 'scissors cut'], ['📁', 'folder'], ['📂', 'open_folder'],
        ['📄', 'page document file'], ['📋', 'clipboard copy'], ['📊', 'bar_chart data'],
        ['📈', 'chart_up growth'], ['📉', 'chart_down decline'], ['🗓️', 'calendar date'],
        ['⏰', 'alarm time'], ['⏳', 'hourglass wait'], ['🧪', 'test_tube experiment'],
        ['📦', 'package box release'], ['🔖', 'bookmark'], ['📚', 'books docs']
      ]
    },
    {
      name: 'Symbols',
      items: [
        ['✅', 'check done tick pass'], ['❌', 'cross fail no'], ['⚠️', 'warning caution'],
        ['❗', 'exclamation important'], ['❓', 'question'], ['💯', 'hundred perfect'],
        ['🚀', 'rocket launch ship'], ['🎯', 'target goal'], ['🏆', 'trophy win'],
        ['🎉', 'tada party celebrate'], ['🎊', 'confetti'], ['🔔', 'bell notify'],
        ['♻️', 'recycle refactor'], ['➕', 'plus add'], ['➖', 'minus remove'],
        ['🔴', 'red_circle'], ['🟠', 'orange_circle'], ['🟡', 'yellow_circle'],
        ['🟢', 'green_circle ok'], ['🔵', 'blue_circle'], ['🟣', 'purple_circle'],
        ['❤️', 'heart love red'], ['🧡', 'orange_heart'], ['💛', 'yellow_heart'],
        ['💚', 'green_heart'], ['💙', 'blue_heart'], ['💜', 'purple_heart'],
        ['🖤', 'black_heart'], ['💔', 'broken_heart'], ['🚩', 'flag issue'],
        ['📢', 'loudspeaker announce'], ['💬', 'speech comment'], ['💭', 'thought'],
        ['🔗', 'link url'], ['⏱️', 'stopwatch timing'], ['🆕', 'new'],
        ['🆗', 'ok_button'], ['🔝', 'top'], ['🚧', 'construction wip']
      ]
    }
  ];

  var EMOJI_ALL = (function () {
    var all = [];
    EMOJI_GROUPS.forEach(function (group) {
      group.items.forEach(function (item) {
        all.push({ char: item[0], words: item[1], name: item[1].split(' ')[0], group: group.name });
      });
    });
    return all;
  })();

  /* Matches on any of an entry's words, preferring ones that start with the query. */
  function searchEmoji(query, limit) {
    var needle = String(query || '').toLowerCase();
    if (!needle) return EMOJI_ALL.slice(0, limit || 8);

    var starts = [];
    var contains = [];

    EMOJI_ALL.forEach(function (entry) {
      var words = entry.words.split(' ');
      for (var i = 0; i < words.length; i++) {
        if (words[i].indexOf(needle) === 0) { starts.push(entry); return; }
      }
      if (entry.words.indexOf(needle) !== -1) contains.push(entry);
    });

    return starts.concat(contains).slice(0, limit || 8);
  }
