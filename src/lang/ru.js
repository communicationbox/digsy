import { FURN_CATALOG, FURN_THEMES } from '../furnCatalog.js';
/* RUSSO — dizionario chiave INGLESE → russo.
   Le 669 chiamate `tr(it, en)` sparse nel codice non si toccano: qui si aggiunge solo la
   traduzione della stringa inglese. Chiave assente = si vede l'inglese (mai vuoto).

   REGOLE per chi corregge:
   - gli SPAZI iniziali e finali contano: molte stringhe vengono concatenate a numeri e nomi
     (" steps" → " шагов"), toglierli attacca le parole;
   - i tag <b> <kbd> <br> e le emoji vanno lasciati dove sono;
   - i nomi propri (specie, città, chimere) NON si traducono: sono inventati e restano uguali.
   Il test `npm test` controlla spazi e tag: se sbagli, fallisce e dice quale riga. */
/* il catalogo dell'arredo porta il russo nella sua scheda (250 nomi scritti accanto alla loro
   ricetta): qui si aggiungono al dizionario invece di ricopiarli a mano due volte */
const RU_CATALOG = Object.fromEntries([...FURN_CATALOG, ...FURN_THEMES].map(f => [f.en, f.ru]));
export const RU = {
  "Haircut, beard, colour and skin. Try as much as you like: you only pay on confirm. Each region hides an exclusive style.": "Причёска, борода, цвет и кожа. Примеряй сколько хочешь: платишь только при подтверждении. В каждом краю свой особый стиль.",

  "chimera created: it roams your yard (pick it as companion)": "химера создана: гуляет во дворе (выбери её спутником)",
  "Your yard has its first tree.": "Во дворе появилось первое дерево.",
  " and your yard comes alive.": " — и двор оживёт.",
  "Welcome back! Your yard earned: ": "С возвращением! Двор принёс: ",
  "You need 2 creatures: chimeras or awakened species.": "Нужно 2 существа: химеры или пробуждённые виды.",

  "{act} to dig: costs 1 ⚡, one spot only once.": "{act} — копать: 1 ⚡, каждое место один раз.",
  "Raw finds get identified at the <b>Museum</b>.": "Необработанные находки определяют в <b>Музее</b>.",
  "Out of energy: sleep, or eat a snack (+15 ⚡).": "Энергия кончилась: поспи или перекуси (+15 ⚡).",
  "Bag full: finds stay <b>on the ground</b>. Bigger bags at the Shop.": "Рюкзак полон: находки остаются <b>на земле</b>. Большие рюкзаки — в Лавке.",
  "Complete case = 1 DNA vial. With 2 you awaken the species at the Lab.": "Полная витрина = 1 пробирка ДНК. С двумя пробуди вид в Лаборатории.",
  "After a complete case, <b>amber</b> pieces ✨ turn up: a second case.": "После полной витрины появляются кусочки <b>янтаря</b> ✨: вторая витрина.",
  "The board 📋 has missions that pay.": "На доске 📋 есть задания с наградой.",
  "Each wonder gives a gift, then rests a few days.": "Каждое чудо даёт подарок, потом отдыхает пару дней.",
  "The <b>boat</b> takes you on the water: {act} to fish.": "На <b>лодке</b> выходишь на воду: {act} — рыбачить.",
  "Caves open with the <b>pickaxe</b>: 6 species only there.": "Пещеры открывает <b>кирка</b>: 6 видов только там.",
  "A day lasts 20 minutes; the season changes every 3.": "День длится 20 минут; сезон меняется каждые 3 дня.",

  'Choose': 'Выбрать',
  'No creatures yet. Awaken one at the Lab.': 'Существ пока нет. Пробуди одно в Лаборатории.',
  'With you': 'С тобой',
  'nobody': 'никого',
  'Leave at home': 'Оставить дома',
  'Left at home': 'Оставлено дома',
  'Your companion follows and helps you. The ones in the yard stay home.': 'Спутник идёт с тобой и помогает. Те, что во дворе, остаются дома.',
  'with you': 'с тобой',
  'Yard': 'Двор',
  'Out of the yard': 'Убрано со двора',
  'Now lives in your yard': 'Теперь живёт у тебя во дворе',
  "The tortoise stretches its neck and looks at you": "Черепаха вытягивает шею и смотрит на тебя",
  "Pet the tortoise": "Погладить черепаху",
  "Furnish the room": "Обставь комнату",
  "Press {act} on an empty tile and put down the armchair: a well kept room gives you a better sleep.": "Нажми {act} на свободной клетке и поставь кресло: в уютной комнате спится лучше.",
  "Sleep 😴": "Спать 😴",
  "open": "открыть",
  "fold": "свернуть",
  "Your account": "Твой аккаунт",
  "This is your bed": "Это твоя кровать",
  "Press {act} on the bed: you sleep here for free when your energy ⚡ runs out.": "Нажми {act} на кровати: здесь спишь бесплатно, когда кончается энергия ⚡.",
  "Head outside": "Выйди из дома",
  "Walk to the door below: the whole world is there to dig.": "Наступи на дверь внизу: весь мир ждёт раскопок.",
  "Away from the plaza, press {act}: each dig costs 1 ⚡ and may turn up a find.": "За пределами площади нажми {act}: каждый раскоп стоит 1 ⚡ и может дать находку.",
  "Hand them to the Curator: they get identified right away.": "Отдай их Хранителю: он определит их сразу.",
  "Collect your finds from the Curator": "Забери находки у Хранителя",
  "Now they have a name: duplicates can be sold, new pieces stay on display.": "Теперь у них есть имя: дубликаты можно продать, новые части останутся в витрине.",
  "There you are, {n}! Come close to me: the earth has a secret to show us today.": "Вот и ты, {n}! Подойди ко мне поближе: сегодня земля хочет показать нам секрет.",
  "Gently with the spade… there it is. The bone of a creature that lived a very long time ago.": "Осторожно лопатой… вот она. Кость существа, жившего очень-очень давно.",
  "I spent my life looking for them. And I always dreamed of seeing one alive, even just one.": "Я всю жизнь их искал. И всегда мечтал увидеть хоть одно живым, хотя бы одно.",
  "This is for you, {n}. I'm tired now… but you have the whole road ahead of you.": "Это тебе, {n}. Я уже устал… а у тебя впереди вся дорога.",
  "I promise, Grandpa: I'll bring them back to life. Every single one.": "Обещаю, дедушка: я верну их к жизни. Всех до одного.",
  "Blessing: 10 digs with double experience": "Благословение: 10 раскопок с двойным опытом",
  "Sparkling platinum hat and golden aura!": "Сверкающая платиновая шляпа и золотая аура!",
  "worth up to 50% more": "стоит до 50% дороже",
  "On iPhone Apple only lets Safari install apps: open <b>digsy.dev-box.it</b> in Safari.": "На iPhone Apple разрешает устанавливать только из Safari: открой <b>digsy.dev-box.it</b> в Safari.",
  "You signed in somewhere else: this game stays only here.": "Вход выполнен в другом месте: эта игра остаётся только здесь.",
  "You need the pickaxe: get it at the Shop": "Нужна кирка: купи её в Лавке",
  "You need a spade: get it at the Shop": "Нужна лопата: купи её в Лавке",
  "You're out of energy: rest at the Inn": "Нет энергии: отдохни в Таверне",
  "Lucky shovel: 60 luckier digs": "Счастливая лопата: 60 удачных раскопок",
  "You need the hatchet: get it at the Shop": "Нужен топорик: купи его в Лавке",
  "You slept. The room is bare: no bonus": "Ты поспал. Комната пустая: бонуса нет",
  "Complete a case at the Museum, then awaken the species at the Lab.": "Заполни витрину в Музее, затем пробуди вид в Лаборатории.",
  "↻ to rotate, tap where to place it": "↻ — повернуть, коснись, куда поставить",
  "↻ or R to rotate, click to place": "↻ или R — повернуть, клик — поставить",
  "Delete your account and online saves? The game on this device stays.": "Удалить аккаунт и сохранения в сети? Игра на этом устройстве останется.",
  "Also saved online: you'll find them on every device.": "Сохранено и в сети: доступно на любом устройстве.",
  "Saved only here. Sign in with Google to have them everywhere.": "Сохранено только здесь. Войди через Google, чтобы они были везде.",

  "Open the browser menu and choose <b>Install</b> or <b>Add to Home screen</b>.": "Открой меню браузера и выбери <b>Установить</b> или <b>На экран «Домой»</b>.",
  "Move with WASD or the arrow keys.": "Двигайся клавишами WASD или стрелками.",
  "Right-click works like <kbd>E</kbd>.": "Правый клик работает как <kbd>E</kbd>.",
  "Explains each thing the first time. Find them again in the Guide (bag → ❔).": "Объясняет всё в первый раз. Потом это есть в Справке (рюкзак → ❔).",
  "Help improve the game": "Помоги улучшить игру",
  "Sends play time and progress, <b>anonymously</b>.": "Отправляет время игры и прогресс <b>анонимно</b>.",
  "The game here and the online one are different. Which do you want to keep?": "Игра здесь и игра в сети отличаются. Какую оставить?",
  "No Google sign-in on itch.io: the game stays on this device.": "На itch.io нельзя войти через Google: игра остаётся на этом устройстве.",
  "Sign in to have the same game on phone and computer.": "Войди, чтобы играть в одну игру на телефоне и компьютере.",
  "The map{key:M} reveals itself as you walk.": "Карта{key:M} открывается по мере того, как ты ходишь.",
  "DNA and awakening": "ДНК и пробуждение",
  "Pick up what sparkles": "Собери то, что блестит",
  "Follow the arrow and press {act}. You need 15 coins for the spade.": "Иди по стрелке и нажми {act}. На лопату нужно 15 монет.",
  "Sell what you picked up and buy the spade 🪏.": "Продай собранное и купи лопату 🪏.",
  "awakening": "пробуждение",
  "The Curator is busy. Come back when you have a find.": "Хранитель занят. Возвращайся, когда найдёшь находку.",
  "Tutorial skipped. You can redo it from the Guide.": "Обучение пропущено. Его можно пройти снова из Справки.",
  "Tutorial done! Now complete the cases and bring the creatures back to life.": "Обучение пройдено! Теперь заполняй витрины и возвращай существ к жизни.",
  "Done! Next: ": "Готово! Дальше: ",
  "a vial of ": "пробирка: ",
  "Move with the stick, act with <kbd>A</kbd>, open the menu with ☰.": "Двигайся стиком, действуй кнопкой <kbd>A</kbd>, меню — ☰.",
  "<kbd>WASD</kbd> move · <kbd>E</kbd> act · <kbd>I</kbd> bag · <kbd>L</kbd> book · <kbd>M</kbd> map · <kbd>Q</kbd> missions<br><b>Click</b> to walk · <b>right-click</b> to act": "<kbd>WASD</kbd> движение · <kbd>E</kbd> действие · <kbd>I</kbd> рюкзак · <kbd>L</kbd> книга · <kbd>M</kbd> карта · <kbd>Q</kbd> задания<br><b>Клик</b> — идти · <b>правый клик</b> — действие",
  "richer cave crystals and light at night": "богаче кристаллы в пещерах и свет ночью",
  "Rideable: flies over the map": "Можно оседлать: летает над картой",
  "gathers finds on its own, slowly": "сам собирает находки, не спеша",
  "each dig uses 1, sleeping refills it": "каждый раскоп тратит 1, сон восстанавливает",
  "you find more in the rain": "в дождь находок больше",
  "goes up as you dig: more energy and rarer finds": "растёт с раскопками: больше энергии и редких находок",
  "at the board 📋, they expire at night": "на доске 📋, истекают к ночи",
  "Drag each bone into place": "Перетащи каждую кость на её место",
  "Three identical pieces become <b>one rarer piece</b>.": "Три одинаковые части превращаются в <b>одну более редкую</b>.",
  "With <b>2 vials</b> a species comes back <b>alive</b>. Awakened": "С <b>2 пробирками</b> вид <b>оживает</b>. Пробуждено",
  "No species has 2 vials yet.": "Ни у одного вида пока нет 2 пробирок.",
  "Generate all fossils": "Создать все окаменелости",
  "Generate": "Создать",
  "Everything in stock, −25%": "Всё в наличии, −25%",
  "+15 ⚡, use it from your bag": "+15 ⚡, используй из рюкзака",
  "Vehicles and light": "Транспорт и свет",
  "twice as fast on foot": "пешком вдвое быстрее",
  "three times as fast on foot": "пешком втрое быстрее",
  "three times as fast on water (needs the boat)": "на воде втрое быстрее (нужна лодка)",
  "you don't have it: buy it at the Shop": "у тебя нет: купи в Лавке",
  "to dig the ground": "чтобы копать землю",
  "use it facing a tree": "используй перед деревом",
  "luckier digs": "удачных раскопок",
  "three times as fast on water": "на воде втрое быстрее",
  "vials: with 2 you awaken it at the Lab": "пробирки: с 2 пробуди вид в Лаборатории",
  "Seasons: ": "Сезоны: ",
  "Times: ": "Время: ",
  "Weather: ": "Погода: ",
  "Market: ": "Рынок: ",
  "Parts: ": "Части: ",
  "Tries: ": "Проверки: ",
  "Commands:\n": "Команды:\n",
  "The parrot whistles happily": "Попугай радостно насвистывает",
  "The bunny hops around": "Зайчик прыгает",
  "The squirrel shows you its acorn": "Белка показывает тебе свой жёлудь",
  "Scratch the parrot's head": "Почесать попугаю голову",
  "Pet the bunny": "Погладить зайчика",
  "Say hi to the squirrel": "Поздороваться с белкой",
  "The cat purrs": "Кот мурлычет",
  "The dog wags happily": "Пёс радостно виляет хвостом",
  "Squeak! The mouse enjoys the cheese": "Пи-пи! Мышонок наслаждается сыром",
  "Pet the cat": "Погладить кота",
  "Cuddle the dog": "Приласкать пса",
  "Give the mouse some cheese": "Дать мышонку сыра",
  "Teleport home": "Телепорт домой",
  "A portal brings you back here": "Портал вернёт тебя сюда",
  "your home · tap to go there": "твой дом · нажми, чтобы перенестись",
  " is in your garden.": " в твоём саду.",
  "is alive again!": "снова жив!",
  "You'll find it in your garden": "Ты найдёшь его в своём саду",
  "Amber cases: ": "Янтарные витрины: ",
  "look at the statue by the Museum": "осмотри статую у Музея",
  "It hatched": "Вылупился",
  "You'll find it in your yard": "Найдёшь его у себя во дворе",
  "Hidden in the stone": "Спрятано в камне",
  "If you found this envelope, you looked at the statue up close. I knew you would.": "Если ты нашёл этот конверт, значит, рассмотрел статую вблизи. Я знал.",
  "Look for the Museum, in town: bring it every bone, even the one that looks like a stone.": "Найди Музей в городе: неси туда каждую кость, даже ту, что похожа на камень.",
  "A letter from me is waiting in every room. I left you one for each zone.": "В каждом зале тебя ждёт моё письмо. Я оставил по одному на каждую зону.",
  "Good luck, little archaeologist.": "Удачи, маленький археолог.",
  "Amber": "Янтарь",

  "Amber cases": "Янтарные витрины",
  "Amber on display: ": "Янтарь в витрине: ",
  "Amber case! ": "Янтарная витрина! ",
  "Cheats on · `vanilla` to undo": "Читы включены · `vanilla` — отменить",

  "Not rebuilt yet. Dig in ": "Ещё не восстановлен. Копай в ",
  " and bring finds to the Museum.": " и неси находки в Музей.",
  "Visit the zone's <b>Museum</b>,<br>then dig.": "Посети <b>Музей</b> зоны,<br>потом копай.",
  "the Museum has a cave room": "в Музее есть пещерный зал",
  "Cave fossil! (to identify)": "Пещерная окаменелость! (определить)",

  "The fireflies bring a legendary map! ": "Светлячки приносят легендарную карту! ",
  "Fireflies caught!": "Светлячки пойманы!",
  "Raw find! (to identify)": "Сырая находка! (определить)",
  "Spade: now you can dig ": "Лопата: теперь можно копать ",
  "Pickaxe: breaks boulders ": "Кирка: разбивает валуны ",
  "Boat: walk into water to board": "Лодка: зайди в воду, чтобы сесть",
  "Torch: more light in the dark": "Факел: больше света в темноте",
  "Get back to shore first": "Сначала вернись на берег",
  "In the roots: a find!": "В корнях: находка!",
  "In the rock: a find!": "В камне: находка!",
  "Aquatic fossil!": "Водная окаменелость!",
  "…nothing. At night the water changes here": "…ничего. Ночью вода здесь меняется",


  "Needs a legendary cave companion": "Нужен легендарный пещерный спутник",
  "Shipped! Pick up tomorrow at the Museum": "Отправлено! Забрать завтра в Музее",
  "Site dug out": "Место раскопано",
  "Bag full: the crystal stays here": "Рюкзак полон: кристалл остаётся здесь",
  "in hand: {act} to place it": "в руке: {act}, чтобы поставить",
  " (bag full: rest on the ground)": " (рюкзак полон: остальное на земле)",
  "Lucky spores: 10 luckier digs": "Счастливые споры: 10 удачных раскопок",
  " pieces wait at the Museum": " частей ждут в Музее",

  "Snacks sold out: come back tomorrow": "Перекусы закончились: приходи завтра",
  "Snack in your bag{key:I}: +15 ⚡": "Перекус в рюкзаке{key:I}: +15 ⚡",
  "No digging while flying": "В полёте копать нельзя",
  "Trees everywhere: it's a forest.": "Деревья повсюду: это уже лес.",
  "All of them! Grandpa's world walks again.": "Все! Мир дедушки снова ходит.",

  "Bought! It's in your tray": "Куплено! Лежит на подносе",
  "This piece doesn't rotate": "Этот предмет не поворачивается",

  "Too far or no path": "Слишком далеко или нет пути",
  "🏛️ Commission expired": "🏛️ Заказ истёк",
  "🥚 Egg almost ready: back to the Lab!": "🥚 Яйцо почти готово: в Лабораторию!",
  "Chisel: scrape the dark rock": "Долото: счищай тёмную породу",
  "Spatula: clean gently": "Шпатель: чисти аккуратно",
  "A board mission expired": "Задание с доски истекло",
  " board missions expired": " заданий с доски истекло",
  ", not something you did.": ", это не твоя ошибка.",
  "Sign-in not confirmed. Try again.": "Вход не подтверждён. Попробуй ещё раз.",
  "Offline: game saved on this device.": "Нет сети: игра сохранена на этом устройстве.",
  "Google not responding. Try later.": "Google не отвечает. Попробуй позже.",



  "Already installed.": "Уже установлено.",

  "The stick appears where you touch.": "Стик появляется там, где касаешься.",
  "The stick stays in the corner.": "Стик всегда в углу.",
  "Hold: Digsy follows the pointer.": "Удерживай: Дигси идёт за указателем.",

  "Click a spot: Digsy walks there.": "Кликни место: Дигси идёт туда.",


  "Reload the game. Your save stays.": "Перезагрузить игру. Сохранение останется.",

  "opens cheats: saving paused until you type <b>vanilla</b>.": "открывает читы: сохранение на паузе, пока не введёшь <b>vanilla</b>.",


  "Online saves on digsy.dev-box.it": "Онлайн-сохранения на digsy.dev-box.it",















  "Frees the slot, finds stay yours": "Освобождает место, находки остаются твоими",
  "Unlock and furnish it your way.": "Открой и обставь по-своему.",
  "Drag or click to place · ↻ (R) rotates": "Перетащи или кликни, куда поставить · ↻ (R) поворот",
  "Bed in hand: {act} to place it": "Кровать в руках: {act}, чтобы поставить",
  "No other arch yet: look far away.": "Других арок пока нет: ищи вдали.",
  "spin them with your finger.": "крути их пальцем.",
  "Too bad! Maybe luck will smile.": "Жаль! Может, удача улыбнётся.",
  "Discover fossils to awaken them.": "Найди окаменелости, чтобы пробудить их.",
  "Every piece of every species": "Каждая часть каждого вида",
  "Infinite DNA": "Бесконечная ДНК",
  "Try free, pay on confirm": "Примеряй бесплатно, платишь при подтверждении",
  "On the water": "На воде",
  "No water around here": "Воды рядом нет",
  "in hand: tap where to place it": "в руке: нажми, куда поставить",
  "Grandpa": "Дедушка",
  "News": "Новости",
  "Credits": "Авторы",
  "Reopen the gate 🔓": "Открыть ворота 🔓",
  "Added to the current batch.": "Добавлено к текущей партии.",
  "Empty: shop at the Furniture store.": "Пусто: загляни в Мебельную лавку.",
  "refills energy": "восстанавливает энергию",
  "Nothing at the Museum yet.": "В Музее пока ничего.",
  "In progress": "Идёт",
  "Finished": "Пройдено",
  "No missions: find the board 📋": "Заданий нет: найди доску 📋",

  "tools, maps, clothes": "инструменты, карты, одежда",

  "dawn at 06:00": "рассвет в 06:00",
  "every 3 days": "каждые 3 дня",



  "pick one in your yard": "выбери во дворе",

  "No sets of 3 yet.": "Пока нет троек.",
  "not at the Museum yet": "ещё не в Музее",
  "duplicates": "дубликатов",



  "Today": "Сегодня",
  "Raw finds go to the Museum first.": "Сырые находки — сначала в Музей.",
  "Nothing to sell.": "Нечего продать.",
  "left today: ": "сегодня осталось: ",
  "sold out: tomorrow": "закончились: завтра",

  "takes you to the nearest city": "переносит в ближайший город",
  "1 sure find": "1 верная находка",
  "to dig": "чтобы копать",
  "60 lucky digs": "60 удачных раскопок",
  "fossils in trees": "окаменелости в деревьях",
  "fossils in rocks": "окаменелости в камнях",
  "sail and fish fossils": "плавай и лови окаменелости",



  "more light in the dark": "больше света в темноте",
  "Handed in! Pick up tomorrow": "Сдано! Забрать завтра",
  "Case complete: DNA at the desk": "Витрина полна: ДНК у стойки",
  "Too soon to sleep": "Спать ещё рано",
  "Tap a find": "Нажми на находку",
  "for the Museum": "для Музея",
  "walk into water to board": "зайди в воду, чтобы сесть",

  "fly over the map": "летай над картой",

  "you can pick it up later": "можно поднять потом",
  ...RU_CATALOG,
  'All': 'Все', 'Search by name…': 'Поиск по названию…', 'Everywhere': 'Везде', 'In this tab': 'В этой вкладке',
  'No piece with this name': 'Нет предмета с таким названием', 'try searching everywhere': 'попробуй искать везде', 'Nothing in this tab': 'В этой вкладке пусто', 'zone style': 'стиль зоны',
  'on display': 'на витрине', 'Zone style': 'Стиль зоны', 'Topics': 'Разделы',



  /* ---- descrizioni del Libro (generate dalla ricetta dello scheletro) ---- */
  'Only at night': 'Только ночью',
  'Only in ': 'Только ',
  " — that's now!": ' — сейчас как раз!',
  'A tiny creature': 'Крошечное существо',
  'A mid-sized creature': 'Существо средних размеров',
  'A towering creature': 'Огромное существо',
  'standing on two legs': 'стоящее на двух ногах',
  'slithering legless': 'ползающее без ног',
  ' of feathers': ' из перьев',
  ' like an insect': ' как у насекомого',
  ' of membrane': ' из перепонки',
  'great pincers': 'мощные клешни',
  'long antennae': 'длинные усики',
  'a needle-like proboscis': 'игольчатый хоботок',
  'two horns': 'два рога',
  'a spiked club tail': 'хвост-булава с шипами',
  'a curved stinger': 'изогнутое жало',
  'a finned tail': 'хвост с плавником',
  'a fan tail': 'веерообразный хвост',
  'a long tail': 'длинный хвост',
  'a dorsal sail': 'спинной парус',
  'spikes along the back': 'шипы вдоль спины',
  'a domed shell': 'куполообразный панцирь',
  'a mighty hump': 'мощный горб',
  'It grazed peacefully among the Golden Meadows.': 'Мирно паслось на Золотых Лугах.',
  'It glided silently across the Bone Dunes.': 'Бесшумно скользило по Костяным Дюнам.',
  'It roamed the mists of the Ashen Woods.': 'Бродило в туманах Пепельных Лесов.',
  'It braved the heat of the Red Lands.': 'Выдерживало зной Красных Земель.',
  'It waded quietly through the Ancient Marsh.': 'Тихо брело по Древнему Болоту.',
  'It endured the cutting winds of the Frozen Wastes.': 'Переносило режущие ветры Ледяных Пустошей.',
  ' A creature of legend: few have ever seen its bones.': ' Легендарное существо: его кости видели немногие.',
  ' A most precious find.': ' Ценнейшая находка.',

  /* ---- Libro dei fossili ---- */
  'Alive': 'Живой',


  'In trees (hatchet)': 'В деревьях (топор)',
  'In rocks (pickaxe)': 'В камнях (кирка)',
  'In water (boat)': 'В воде (лодка)',
  'Underground': 'Под землёй',
  'Owned': 'В наличии',
  'Awakened': 'Пробуждён',
  'Bones handed to the Museum': 'Кости, переданные в Музей',
  'Complete': 'Полный',
  'Bones': 'Кости',
  'The book is empty': 'Книга пуста',

  'to index': 'для каталога',
  'Skeleton': 'Скелет',

  /* ---- grotte ---- */
  'NEW WING: DEEP CAVES': 'НОВОЕ КРЫЛО: ГЛУБОКИЕ ПЕЩЕРЫ',


  '…just a dull crystal': '…всего лишь тусклый кристалл',

  'Cave': 'Пещера',

  /* ---- console dei comandi ---- */

  'Dig site': 'Место раскопок',
  'Wreck (E to search)': 'Обломки (E — обыскать)',
  'Coins: ': 'Монеты: ',
  'Energy: ': 'Энергия: ',
  'Day ': 'День ',
  'Seasons: spring, summer, autumn, winter (0-3)': 'Сезоны: весна, лето, осень, зима (0-3)',
  'Speed ×': 'Скорость ×',
  'GODMODE: all unlocked (trophies at Platinum: aura + glitter), infinite, ×5, fly': 'РЕЖИМ БОГА: всё открыто (трофеи на Платине: аура + блеск), бесконечно, ×5, полёт',
  'bag → Letters': 'рюкзак → Письма',
  'Infinite DNA for all species': 'Бесконечная ДНК для всех видов',
  'All fossils in your bag': 'Все ископаемые в рюкзаке',
  'Full energy': 'Полная энергия',
  'Targets: ': 'Цели: ',
  'Biome not found nearby': 'Поблизости такого биома нет',
  'No big city found': 'Большой город не найден',
  'already handed in: at the Museum press «Collect», then the Curator offers the restoration': 'уже сдано: в Музее нажми «Забрать», потом Хранитель предложит реставрацию',
  'No site found nearby': 'Поблизости нет места раскопок',
  'No wreck found nearby': 'Поблизости нет обломков',
  'No landmark found nearby': 'Поблизости нет чуда',
  'No buried skeleton found nearby': 'Поблизости нет закопанного скелета',
  '5 parts to dig': '5 частей на раскопку',
  'Seen everything around — reset, run tour again': 'Вокруг всё осмотрено — сброшено, запустите тур снова',
  'Replaying intro…': 'Повтор вступления…',
  'auto weather': 'погода автоматически',
  'weather: rain/sandstorm/fog/ash/snow/clear/off': 'погода: дождь/песчаная буря/туман/пепел/снег/ясно/выкл',
  'auto market (per species, changes by day)': 'рынок автоматически (по видам, меняется по дням)',
  'market: basso/normale/alto/record/off': 'рынок: низкий/обычный/высокий/рекорд/выкл',
  'Fly ON': 'Полёт ВКЛ',
  'Fly OFF': 'Полёт ВЫКЛ',
  'Vanilla: cheats removed, save restored': 'Vanilla: читы убраны, сохранение восстановлено',
  'Available commands:\n': 'Доступные команды:\n',
  'Unknown command: ': 'Неизвестная команда: ',
  'Use: ': 'Использование: ',
  'Number expected': 'Ожидается число',

  /* ---- commissione del museo ---- */
  'pieces of ': 'частей вида ',
  '1 vial of ': '1 пробирка ',
  'expired': 'просрочено',
  'last day': 'последний день',
  ' days left': ' дн. осталось',

  /* ---- bussola, livelli, zaino ---- */
  ' Entering: ': ' Вход в зону: ',
  'Welcome to ': 'Добро пожаловать в ',
  ' steps': ' шагов',
  'Archaeologist level ': 'Уровень археолога ',
  'Bag full: find left on the ground': 'Рюкзак полон: находка осталась на земле',
  'You already have the biggest bag': 'У вас уже самый большой рюкзак',
  'You need 🪙 ': 'Нужно 🪙 ',
  'Bigger bag! Capacity ': 'Рюкзак больше! Вместимость ',

  /* ---- scavo ---- */
  'No digging in town': 'В городе копать нельзя',

  "You can't dig here": 'Здесь копать нельзя',
  'Already dug here': 'Здесь уже копали',

  'The X was true! A ': 'Крестик не обманул! Находка: ',
  ' find (needs identifying)': ' (нужно определить)',

  '…just dirt': '…просто земля',
  'The lucky shovel wore out': 'Счастливая лопатка износилась',

  'Hatchet: chop trees ': 'Топор: рубите деревья ',


  'Skates: move at double speed': 'Коньки: скорость ×2',
  'Bicycle: triple speed on foot': 'Велосипед: скорость ×3 по суше',
  'Motorboat: triple speed on water': 'Моторка: скорость ×3 по воде',

  'You already own it': 'У вас это уже есть',
  'You need the boat first': 'Сначала нужна лодка',

  'Bought': 'Куплено',

  'Return scroll in your bag': 'Свиток возврата в рюкзаке',
  'No scrolls': 'Свитков нет',
  'Teleported to ': 'Перемещение в ',
  'No museum city found nearby': 'Поблизости нет города с музеем',
  'Home not found yet': 'Дом ещё не найден',
  "You're already home": 'Ты уже дома',
  "You're home: the portal takes you back": "Ты дома: портал вернёт тебя назад",
  'Back where you were': 'Обратно туда, где ты был',

  '…the vein is silent this season': '…в этот сезон жила молчит',
  '…nothing': '…ничего',
  '…just wood chips': '…только щепки',
  '…just rubble': '…только щебень',
  '…just rubble. This vein opens in ': '…только щебень. Эта жила открывается в сезон: ',






  '…nothing bites': '…не клюёт',
  '🪙 Plink! …just ripples': '🪙 Плюх! …только круги по воде',
  '✨ The fountain grants you a ': '✨ Фонтан дарит вам: ',
  'Boost your luck': 'Испытай удачу',
  'Land the toss in the golden ripple': 'Останови бросок в золотом отблеске',
  'Nice throw!': 'Хороший бросок!',
  'Wow, well done!': 'Ух ты, отлично!',
  'Three in a row — here\'s your prize!': 'Три из трёх — вот твой приз!',

  'Pick up from the ground ✨': 'Подними с земли ✨',
  'Net the fireflies ✨': 'Лови светлячков сачком ✨',


  'map ': 'карта ',
  'Fountain: stop the marker on the golden zone': 'Фонтан: остановите курсор на золотой зоне',
  'Deep night + fireflies quest active — go outdoors': 'Глубокая ночь + задание со светлячками активно — выйдите наружу',
  'Dawn': 'Рассвет',
  'Fireflies': 'Светлячки',
  'caught at night': 'пойманы ночью',
  'Catch ': 'Поймай ',
  'fireflies (at night, outdoors)': 'светлячков (ночью, на улице)',
  ' steps ': ' шагов ',
  'The cartographer finds nothing…': 'Картограф ничего не находит…',
  'X marked: ': 'Крестик отмечен: ',

  '⛏️✨ Precious find from the site! (': '⛏️✨ Ценная находка на раскопках! (',
  ' left)': ' осталось)',
  'Picked up: ': 'Подобрано: ',
  'Bag full: free some space first': 'Рюкзак полон: сначала освободите место',
  'Picked up from the ground': 'Подобрано с земли',
  'Left on the ground': 'Оставлено на земле',
  'Wreck picked clean': 'Обломки обчищены',
  'Find from the wreck! (': 'Находка из обломков! (',

  'Get close to a glowing deposit': 'Подойдите к светящейся жиле',

  'Rested: energy restored': 'Отдых: энергия восстановлена',
  '3 snacks in your bag': '3 перекуса в рюкзаке',

  /* ---- meraviglie ---- */
  'Under the ribs: 3 finds!': 'Под рёбрами — 3 находки!',
  'The eruption spits out 2 finds!': 'Извержение выбрасывает 2 находки!',
  'A rare find was in the hollow!': 'В дупле была редкая находка!',
  'The marsh gives a find back': 'Болото возвращает находку',
  'Rich waters: 2 water finds': 'Богатые воды: 2 водные находки',
  'You need the pickaxe': 'Нужна кирка',
  'The vein yields 3 finds!': 'Жила даёт 3 находки!',
  'You free ': 'Вы освобождаете ',
  ' of ': ' вида ',
  ' from the ice!': ' изо льда!',


  'Nothing happens': 'Ничего не происходит',

  /* ---- museo, laboratorio, locanda ---- */
  'Nothing to identify': 'Нечего определять',
  'No raw finds to hand in': 'Нет необработанных находок для сдачи',

  'Dawn of day ': 'Рассвет дня ',
  '! Full energy': '! Энергия полная',
  'Night falls. Full energy': 'Наступает ночь. Энергия полная',

  'You need ': 'Нужно ',

  'No snacks in your bag': 'В рюкзаке нет перекусов',
  'Energy already full': 'Энергия уже полная',


  /* ---- HUD e intro ---- */
  'bag ': 'рюкзак ',
  ' menu': ' меню',
  'explore · dig · discover': 'исследуй · копай · открывай',
  'Skip ⏭': 'Пропустить ⏭',
  'click to continue': 'нажмите, чтобы продолжить',
  'Hold on! I must give you something I have kept for years.':
    'Постойте! Я должен передать вам кое-что, что храню уже много лет.',
  'Wait! I have something for you.': 'Подождите! У меня кое-что для вас есть.',
  'You filled every room of my museum. Every single one.':
    'Вы заполнили все залы моего музея. Все до единого.',
  "Your grandparent left one last envelope for you.":
    "Твой дедушка оставил тебе последний конверт.",
  'I believe the moment has come. Sit down: read it slowly.':
    'Думаю, этот момент настал. Присядьте и читайте не спеша.',
  "Your grandparent left this: \"give it when the room is full\".":
    "Это оставил твой дедушка: «отдай, когда зал заполнится».",
  'I only kept the promise. The rest is written in there.':
    'Я лишь сдержал слово. Остальное написано внутри.',
  '…thank you, Grandpa.': '…спасибо, дедушка.',
  "I'll read it right away!": 'Прочту прямо сейчас!',
  'A LETTER FROM GRANDPA': 'ПИСЬМО ОТ ДЕДУШКИ',
  'Here are the Book pages of ': 'Вот страницы Книги для зоны ',
  '. Keep them safe.': '. Берегите их.',
  "From fossil DNA I bring creatures back to life.":
    "Из ДНК окаменелостей я возвращаю существ к жизни.",
  "A mystery find? Bring it to my desk.":
    "Непонятная находка? Неси к стойке.",
  'NEW BOOK DELIVERED': 'ПОЛУЧЕНА НОВАЯ КНИГА',
  'Pages of ': 'Страницы: ',
  'WONDER DISCOVERED': 'ОТКРЫТО ЧУДО',
  'Added to the Wonders in your Book': 'Добавлено в раздел «Чудеса» вашей Книги',
  '📅 Day ': '📅 День ',

  "Storage full: NOT saving!":
    "Память заполнена: игра НЕ сохраняется!",
  "Saving blocked (private mode?)":
    "Сохранение заблокировано (приватный режим?)",

  /* ---- preparazione del reperto ---- */
  'of': 'вида',
  'Perfect restoration': 'Безупречная реставрация',
  'Well restored': 'Хорошо отреставрировано',
  'Roughly cleaned': 'Очищено кое-как',
  'Left rough': 'Оставлено необработанным',
  'Brush': 'Кисть',
  'Chisel': 'Зубило',
  'Spatula': 'Шпатель',
  'Cleaned': 'Очистка',
  'Intact': 'Целостность',
  'clean': 'очистка',
  'intact': 'целостность',
  'value': 'ценность',
  "Brush: drag to dust off": "Кисть: веди, чтобы смахнуть пыль",



  /* ---- ricomponi lo scheletro (museo) ---- */
  'SKELETON': 'СКЕЛЕТ',

  'Perfect fit!': 'Идеально подогнано!',
  'Nicely fitted': 'Хорошо подогнано',
  'Fitted': 'Подогнано',
  'Skipped': 'Пропущено',
  'Pedestal updated': 'Постамент обновлён',
  'Rebuild the skeleton: drag the piece into the right socket': 'Собери скелет: перетащи кость в нужное гнездо',
  'New hat at the Tailor: ': 'Новая шляпа у портного: ',

  /* ---- allevamento (uova, genetica) ---- */

  'Breed a chimera': 'Вывести химеру',
  'Ready to hatch!': 'Готово к вылуплению!',
  'Child of': 'Дитя',
  'Hatch!': 'Вылупить!',
  'Incubating': 'Высиживается',
  'days left': 'дней осталось',



  'Skull: parent 1': 'Череп: родитель 1',
  'Skull: parent 2': 'Череп: родитель 2',
  'Ribcage: parent 1': 'Грудь: родитель 1',
  'Ribcage: parent 2': 'Грудь: родитель 2',
  'Leg: parent 1': 'Нога: родитель 1',
  'Leg: parent 2': 'Нога: родитель 2',
  'Lay the egg': 'Отложить яйцо',
  'It hatched': 'Вылупился',
  "You'll find it in your yard": 'Найдёшь его у себя во дворе',
  'Pick two DIFFERENT parents': 'Выбери двух РАЗНЫХ родителей',
  "You don't have enough duplicates (": 'Недостаточно дубликатов (',
  'mutation': 'мутация',
  'extra rarity': 'доп. редкость',
  'food': 'корм',
  'Egg laid! Come back in ': 'Яйцо отложено! Возвращайся через ',
  ' days': ' дней',
  'Egg laid: ': 'Яйцо отложено: ',
  'Could not lay the egg': 'Не удалось отложить яйцо',
  'No egg incubating': 'Нет яйца в кладке',
  'Hatched: ': 'Вылупилось: ',
  'Not ready yet': 'Ещё не готово',

  /* ---- parco che rende (idle) ---- */


  /* ---- gioca col compagno (lancia e riporta) ---- */





  /* ---- missioni ---- */
  'Deliver ': 'Сдайте ',
  'Bring ': 'Принесите ',
  '(any species)': '(любого вида)',

  /* ---- menu / splash ---- */
  'Saves': 'Сохранения',
  'Day': 'День',
  'empty': 'пусто',
  'Save': 'Сохранить',
  'Load': 'Загрузить',
  'New game': 'Новая игра',
  'Music': 'Музыка',
  'Music volume': 'Громкость музыки',
  'Sound FX': 'Звуки',
  'SFX volume': 'Громкость звуков',
  'Language': 'Язык',
  'Hall of Fame': 'Зал славы',
  'Locked': 'Закрыто',
  'Controls': 'Управление',
  'a cozy game of digging and discovery.': 'уютная игра о раскопках и открытиях.',
  'by': 'автор',
  'Resume': 'Продолжить игру',
  'Continue': 'Продолжить',
  'Trophies': 'Трофеи',
  /* ---- forme maglia/pantaloni ---- */
  'T-shirt': 'Футболка', 'Tank top': 'Майка', 'Hoodie': 'Худи',
  'Trousers': 'Штаны', 'Shorts': 'Шорты', 'Skirt': 'Юбка', 'Overalls': 'Комбинезон',
  /* ---- trofei a livelli ---- */
  'Bronze': 'Бронза', 'Silver': 'Серебро', 'Gold': 'Золото', 'Platinum': 'Платина',
  'Platinum!': 'Платина!',
  'Tiers unlocked': 'Открыто ступеней',
  'Bronze · Silver · Gold · Platinum': 'Бронза · Серебро · Золото · Платина',
  'All trophies at PLATINUM! (9 glitter hats + aura)': 'Все трофеи на ПЛАТИНЕ! (9 блестящих шляп + аура)',

  'New hat: ': 'Новая шляпа: ',
  'Gold Crown': 'Золотая корона', 'Gold Cap': 'Золотая шапочка', 'Gold Laurel': 'Золотой лавр',
  'Gold Goggles': 'Золотые очки', 'Gold Horns': 'Золотые рога', 'Gold Pith': 'Золотой шлем',
  'Gold Feather': 'Золотое перо', 'Gold Hard Hat': 'Золотая каска', 'Gold Lamp': 'Золотая лампа',
  'Discoverer': 'Первооткрыватель', 'Species discovered': 'Открыто видов',
  'Collector': 'Коллекционер', 'Complete cases': 'Полные витрины',
  'Geneticist': 'Генетик',
  'Creator': 'Творец', 'Chimeras assembled': 'Собрано химер',
  'Wealthy': 'Богач', 'Coins amassed': 'Накоплено монет',
  'Archaeologist': 'Археолог', 'Archaeologist level': 'Уровень археолога',
  'Fixer': 'Порученец', 'Missions completed': 'Выполнено заданий',
  'Digger': 'Копатель', 'Fossils found': 'Найдено находок',
  'Spelunker': 'Спелеолог',
  'Storage full!': 'Хранилище переполнено!',
  'Confirm?': 'Подтвердить?',
  'Sure?': 'Уверены?',

  /* ---- guida rapida ---- */
  'Digging': 'Раскопки',
  'Raw finds': 'Необработанные находки',

  'Energy': 'Энергия',

  'Bag full': 'Рюкзак полон',
  'Water': 'Вода',
  'Caves': 'Пещеры',

  'Wonders': 'Чудеса',

  'Map': 'Карта',

  'Missions': 'Задания',

  'Night and seasons': 'Ночь и сезоны',


  /* ---- prompt sul campo ---- */
  'Dig the deposit ⛏️': 'Разбить жилу ⛏️',
  'Talk to the Master Digger 🎓': 'Поговорить с Мастером раскопок 🎓',
  'Talk to ': 'Поговорить: ',
  'Dig at the site ⛏️ (': 'Копать на раскопках ⛏️ (',
  'Site exhausted': 'Место исчерпано',
  'Dig: ': 'Копать: ',
  ' · skeleton complete!': ' · скелет собран!',
  'Mission board 📋': 'Доска заданий 📋',

  'Companion & yard 🐾': 'Спутник и двор 🐾',
  'Yard': 'Двор',

  'Toss 1 🪙 into the fountain': 'Бросить 1 🪙 в фонтан',
  'Search the wreck 🚢 (': 'Обыскать обломки 🚢 (',
  'Pick ': 'Подобрать ',
  'Pick up ✨': 'Подобрать ✨',

  /* ---- pannello missioni ---- */
  'Your missions': 'Ваши задания',
  'reward': 'награда',
  'Deliver': 'Сдать',
  'Museum commission': 'Заказ Музея',
  'You have': 'У вас',
  'deliver at the Museum': 'сдать в Музее',
  'Board': 'Доска',
  '✓ done': '✓ выполнено',
  'taken': 'взято',
  'Accept': 'Принять',
  'You already have ': 'У вас уже ',
  ' missions': ' заданий',
  'Mission accepted': 'Задание принято',
  'Delivered! ': 'Сдано! ',
  'Achievements': 'Достижения',

  /* ---- lettere del nonno ---- */
  '— Grandpa': '— дедушка',
  'Back to the letters': 'Назад к письмам',
  'Close': 'Закрыть',
  'A letter from Grandpa': 'Письмо от дедушки',

  'tap to read it again': 'нажмите, чтобы перечитать',
  'once you have all the others': 'когда соберёте все остальные',
  'fill the room of ': 'заполните зал: ',

  /* ---- meraviglie: uso, archi, libro ---- */
  'usable once every ': 'можно использовать раз в ',
  ' days · ': ' дн. · ',
  'always available · ': 'доступно всегда · ',
  'Use': 'Использовать',
  'Wonder': 'Чудо',
  "Walk through thinking of another arch.":
    "Пройди сквозь арку, думая о другой.",

  'Go': 'Отправиться',
  'Passage': 'Переход',
  'You step through the arch…': 'Вы проходите сквозь арку…',
  'The aurora only shows at night': 'Сияние бывает только ночью',
  'You already know every creature': 'Вы уже знаете всех существ',
  'VISION': 'ВИДЕНИЕ',
  'Wonders found': 'Чудес найдено',

  'find it in ': 'ищите в зоне ',
  'Wonders of the world': 'Чудеса света',

  /* ---- mappa ---- */
  'wonders ': 'чудеса ',
  'Map of the world': 'Карта мира',
  'Legend': 'Легенда',
  /* taglie degli abitati: sulla mappa dicono anche COSA ci si trova */
  'town': 'посёлок',
  'Hamlet': 'деревушка',
  'Town': 'посёлок',
  'City': 'город',
  'Museum': 'Музей',
  /* account e partita in cloud */
  'in sync': 'синхронизировано',
  'saving…': 'сохраняю…',
  'offline: saved here, will retry': 'нет сети: сохранил здесь, попробую позже',
  'two different games': 'две разные игры',
  'connection error': 'ошибка соединения',
  'not signed in': 'вход не выполнен',
  'Your game': 'Твоя игра',


  'this one': 'эту',
  'the saved one': 'сохранённую',
  'Sign out': 'Выйти из аккаунта',
  'Delete account and games': 'Удалить аккаунт и игры',


  'Sign-in failed': 'Не удалось войти',
  'Sign-in unavailable': 'Вход недоступен',
  'Done': 'Готово',
  'Exit': 'Выход',
  'CHEAT · NO SAVE': 'ЧИТ · БЕЗ СОХРАНЕНИЯ',
  'Update the game': 'Обновить игру',
  'city with Museum': 'город с Музеем', 'hamlet': 'деревушка', 'bones to dig': 'кости для раскопок',
  'Tap a sign to see what it is.': 'Нажми на знак, чтобы узнать, что это.', 'Home': 'Дом', 'Bones showing': 'Кости выступают из земли', 'digs left: ': 'осталось раскопок: ',
  ' map': ' карта',
  /* intro: dove si porta il primo fossile */
  'has a Museum': 'есть Музей',
  'wonder': 'чудо',
  'arch (travel)': 'арка (переход)',
  'treasure X': 'крестик клада',
  'you are here': 'вы здесь',
  'unexplored': 'не исследовано',
  'You are here': 'Вы здесь',
  'Treasure X ': 'Крестик клада ',
  'MAP REVEALED': 'КАРТА ОТКРЫТА',
  ' more tiles': ' новых клеток',

  /* ---- suggerimenti e guida ---- */
  'Got it': 'Понятно',

  'Tip': 'Подсказка',


  'Guide': 'Справка',

  'ready': 'готово',

  /* ---- compagno ---- */

  'No companion': 'Без спутника',
  'with you': 'с вами',
  'Companion': 'Спутник',
  ' is with you!': ' теперь с вами!',

  /* ---- guida HUD ---- */

  'Coins': 'Монеты',



  'Season': 'Сезон',

  'Zone': 'Зона',
  'Weather': 'Погода',
  'Clear': 'Ясно',

  'Archaeologist level': 'Уровень археолога',


  'none': 'нет',


  'Quick guide': 'Краткая справка',

  /* ---- maestro scavatore ---- */
  'Level': 'Уровень',
  ' for level ': ' до уровня ',
  'about ': 'примерно ',
  ' common finds': ' обычных находок',
  'At level ': 'На уровне ',
  'max energy': 'макс. энергия',
  'dig': 'копка',
  'rares': 'редкости',

  'Master Digger': 'Мастер раскопок',

  /* ---- laboratorio ---- */

  'DEBUG: infinite DNA vials. Awakened': 'ОТЛАДКА: бесконечные пробирки ДНК. Пробуждено',


  'DNA vial ready': 'Пробирка ДНК готова',
  'Awaken': 'Пробудить',
  'Debug': 'Отладка',



  'Fossil Book': 'Книга ископаемых',
  'Fossils reconstructed': 'Восстановлено ископаемых',
  'Open (L)': 'Открыть (L)',
  'All fossils in your bag!': 'Все ископаемые в рюкзаке!',

  /* ---- negozio ---- */


  'Total sellable': 'Всего к продаже',
  'Sell all': 'Продать всё',
  'Sell': 'Продать',
  'Collected objects': 'Собранные предметы',
  'Total': 'Всего',



  'Sold out': 'Распродано',
  'Snack': 'Перекус',

  'Return scroll': 'Свиток возврата',

  'Bigger bag': 'Рюкзак побольше',
  'Fossil capacity': 'Вместимость для находок',
  'maxed': 'максимум',
  'Treasure maps': 'Карты сокровищ',

  'steps': 'шагов',
  'Tools': 'Инструменты',
  'Spade': 'Лопата',

  'Lucky shovel': 'Счастливая лопатка',

  'charges': 'зарядов',
  'Hatchet': 'Топор',

  'Pickaxe': 'Кирка',

  'Boat': 'Лодка',


  'Skates': 'Коньки',

  'Bicycle': 'Велосипед',

  'Motorboat': 'Моторная лодка',

  'Torch': 'Факел',

  'Compass': 'Компас',

  'Sold ': 'Продано ',
  ' finds for 🪙': ' находок за 🪙',
  ' objects for 🪙': ' предметов за 🪙',

  /* ---- museo ---- */
  '📖 New pages in the book: ': '📖 Новые страницы в книге: ',
  'Hand in all': 'Сдать всё',

  'Skip': 'Пропустить',
  'Restore': 'Реставрировать',
  'Being examined': 'На исследовании',
  'Come back tomorrow (day ': 'Возвращайтесь завтра (день ',
  'Ready!': 'Готово!',
  'finds identified': 'находок определено',
  'Collect': 'Забрать',
  'Book': 'Книга',
  'DNA refills': 'Пополнение ДНК',

  'Handed in! Ready to collect': 'Сдано! Готово к выдаче',
  'Case complete! DNA vial of ': 'Витрина собрана! Пробирка ДНК: ',
  'Returned to you': 'Возвращено вам',
  'No duplicates: everything on display!': 'Дубликатов нет: всё пошло в экспозицию!',
  'New pieces displayed': 'Новых частей в экспозиции',
  "Needs <b>identified</b> pieces.":
    "Нужны <b>определённые</b> части.",
  'days': 'дн.',

  'Commission accepted': 'Заказ принят',
  'Commission complete!': 'Заказ выполнен!',
  'Pieces on display': 'Частей в экспозиции',

  'Sleep until night 🌙': 'Спать до ночи 🌙',

  /* ---- zaino ---- */
  'Bag': 'Рюкзак',
  'Finds': 'Находки',
  'Raw finds for the Museum': 'Необработанные находки для Музея',
  'Raw': 'Необработанное',
  'coins': 'монет',
  'Empty: go dig!': 'Пусто: идите копать!',



  'boulders, spires and cave crystals': 'валуны, шпили и пещерные кристаллы',
  'wider light halo': 'шире круг света',
  'points to town': 'указывает на город',
  'off': 'выкл',
  'On': 'Вкл',

  'in use': 'используется',
  'spare': 'в запасе',




  'to the nearest city': 'в ближайший город',
  'sell at the Shop': 'продать в Магазине',
  'Stop': 'Стоп',
  'Track': 'Следить',
  'Vehicles': 'Транспорт',
  'Other': 'Прочее',
  'DNA': 'ДНК',

  'At the museum': 'В музее',
  'pickup from day ': 'забрать с дня ',
  'Chimeras': 'Химеры',
  'Chimera': 'Химера',
  'chimera': 'химера',
  'chimeras': 'химер',
  'already revived': 'уже оживлён',
  'not used yet': 'ещё не используется',
  'in ': 'в ',
  'No DNA or chimeras yet': 'Пока нет ни ДНК, ни химер',
  'Objects': 'Предметы',
  'Letters': 'Письма',
  'Compass tracking the X': 'Компас следит за крестиком',
  'Compass back to town': 'Компас снова на город',
  'Leave it on the ground?': 'Оставить на земле?',

  'Cancel': 'Отмена',
  'Drop it': 'Бросить',

  /* ---- barbiere e sartoria ---- */
  'Unlocked! ': 'Открыто! ',
  'Applied for 🪙 ': 'Применено за 🪙 ',
  'Done!': 'Готово!',
  'unlock': 'открыть',

  'Confirm': 'Подтвердить',


  'Haircut': 'Стрижка',

  /* viso: barba/baffi dal Barbiere, occhiali dalla Sartoria */
  'Beard': 'Борода',
  'Glasses': 'Очки',
  'Beard colour': 'Цвет бороды',
  'Frame colour': 'Цвет оправы',
  'None': 'Нет',
  'Moustache': 'Усы',
  'Goatee': 'Эспаньолка',
  'Full beard': 'Окладистая борода',
  'Round': 'Круглые',
  'Rectangular': 'Прямоугольные',
  'Sunglasses': 'Солнечные',



  /* ---- editor del personaggio ---- */
  'Create your Digsy': 'Создайте своего Digsy',
  'Name': 'Имя',
  'Random character': 'Случайный персонаж',
  'Eyes': 'Глаза',
  'Hair color': 'Цвет волос',
  'Start the adventure!': 'Начать приключение!',

  /* ---- fontane e attese ---- */
  'resting: come back tomorrow': 'отдыхает: приходите завтра',

  /* ---- etichette dei dati (rarità, parti, zone, edifici, stagioni, aspetto) ---- */
  'Common': 'Обычное', 'Rare': 'Редкое', 'Exceptional': 'Исключительное', 'Legendary': 'Легендарное',
  'Skull': 'Череп', 'Ribcage': 'Грудная клетка', 'Leg': 'Лапа', 'Tail': 'Хвост', 'Horn': 'Рог',
  'Golden Meadows': 'Золотые Луга', 'Bone Dunes': 'Костяные Дюны', 'Ashen Woods': 'Пепельные Леса',
  'Red Lands': 'Красные Земли', 'Ancient Marsh': 'Древнее Болото', 'Frozen Wastes': 'Ледяные Пустоши',
  'Deep Caves': 'Глубокие Пещеры',
  'Laboratory': 'Лаборатория', 'Shop': 'Магазин', 'Museum': 'Музей', 'Inn': 'Таверна',
  'Barber': 'Парикмахерская', 'Tailor': 'Ателье',
  'spring': 'весна', 'summer': 'лето', 'autumn': 'осень', 'winter': 'зима',
  'Hat': 'Шляпа', 'Shirt': 'Рубашка', 'Pants': 'Штаны', 'Skin': 'Кожа',
  'Shaved bald': 'Налысо', 'Buzz cut': 'Ёжик', 'Bob': 'Каре', 'Long': 'Длинные', 'Curly': 'Кудрявые',
  'Punk': 'Панк', 'Balding': 'С залысинами', 'Sprouts': 'Ростки', 'Dune': 'Дюна',
  'Woodland': 'Лесная', 'Ember': 'Пламя', 'Algae': 'Водоросли', 'Frost': 'Иней',
  'Explorer': 'Исследователь', 'Cap': 'Кепка', 'Beanie': 'Шапочка', 'Viking': 'Викинг',
  'Cowboy': 'Ковбой', 'Sombrero': 'Сомбреро', 'Party': 'Праздник', 'Santa': 'Дед Мороз',
  'Flower crown': 'Венок', 'Bandana': 'Бандана', 'Hood': 'Капюшон', 'Snorkel': 'Трубка',
  'Ushanka': 'Ушанка',

  /* ---- ultime voci (stringhe scritte con gli apici doppi nel codice) ---- */
  'drifting in mid-air': 'парящее в воздухе',
  "All of Grandpa's letters unlocked (": 'Все письма дедушки открыты (',
  "I've got one in my bag already: coming!": 'У меня уже есть одно в рюкзаке — иду!',
  "Thank you! I'll fill them all.": 'Спасибо! Я заполню их все.',
  "What's new": 'Что нового',

  'finds ': 'находки ',


  'No flying here: get down and walk': 'Здесь не летают: спустись и иди пешком',

  'Airborne! You cross anything': 'В полёте! Пролетаешь над всем',
  'You landed': 'Ты приземлился',
  'Flying mount': 'Летающий скакун',

  'Flying': 'В полёте',
  'Ride': 'Верхом',
  'Types: ': 'Типы: ',
  'No species of that type': 'Нет вида такого типа',
  'rideable (from the bag)': 'верхом (из рюкзака)',
  'auto-gathers': 'сам добывает',
  'companion ': 'спутник ',
  'Riding ': 'Верхом на ',
  'fly over the map (land from the bag)': 'летай над картой (приземлиться из рюкзака)',
  'No flying in caves: leave first': 'В пещерах не летают: сначала выйди',
  'Sleep until dawn 🌙': 'Спать до рассвета 🌙',


  'Drop': 'Бросить',

  'Mission dropped': 'Задание брошено',
  /* ---- statua del nonno (città grandi, accanto al Museo) ---- */
  'Monument to the old archaeologist': 'Памятник старому археологу',
  'Engraved plaque': 'Табличка',
  "He found what no one remembered.":
    "Он нашёл то, чего никто не помнил.",
  'He never saw a single one alive.': 'Он не увидел ни одного живым.',
  'the townsfolk': 'горожане',
  'Bring back all ': 'Верни все ',
  'The pond has filled.': 'Пруд наполнился.',
  'Bushes and rocks along the fence.': 'Кусты и камни вдоль ограды.',
  'Flower beds have come up.': 'Поднялись цветочные клумбы.',


  "YOUR GRANDPARENT'S WORLD": 'МИР ДЕДУШКИ',
  'Brought back to life': 'Возвращено к жизни',
  'All of them. Your grandparent\'s world walks again.': 'Все. Мир дедушки снова ходит по земле.',

  '1 more to the next milestone.': 'До следующей вехи остался 1.',
  ' more to the next milestone.': ' до следующей вехи.',

  ' Your grandparent never saw one alive: you did. ': ' Дедушка не видел ни одного живым: а ты видишь. ',
  ' left to go.': ' осталось.',



  /* ---- tutorial: frasi corte, una cosa per volta ---- */


  'Go to the Shop': 'Иди в Лавку',


  'Leave town and dig': 'Выйди из города и копай',

  'Take your finds to the Museum': 'Отнеси находки в Музей',


  'Species discovered': 'Видов открыто',
  'finds': 'находок',
  'Complete cases': 'Витрин собрано',
  'closest: ': 'ближе всего: ',
  'all filled': 'все заполнены',
  'Fossil Book': 'Книга окаменелостей',

  'Desk': 'Стойка',
  'Progress': 'Прогресс',
  /* ---- SALE del Museo: la strada verso l'ultima lettera del nonno ---- */
  'Museum rooms': 'Залы Музея',
  /* ---- intro accorciata + TUTORIAL d'apertura ---- */
  'chimeras': 'химеры',
  'identifies': 'определяет',
  'sleep': 'сон',
  'clothes': 'одежда',
  'hair': 'волосы',
  'skip': 'пропустить',
  'sell and buy': 'продать и купить',



  'Opening tutorial': 'Вступительное обучение',



  'Redo': 'Заново',
  'Tutorial restarted': 'Обучение начато заново',


  "Grandpa's letters": 'Письма дедушки',
  "from Grandpa's notebook": 'из тетради дедушки',





  /* ---- suggerimenti con segnaposto ({act} = tasto azione, {key:M} = scorciatoia) ---- */





  /* ---- intro e aggiornamento (beta) ---- */
  'tap to continue': 'нажмите, чтобы продолжить',
  'little one': 'малыш',
  'A few years later…': 'Несколько лет спустя…',

  /* ---- MERAVIGLIE: nome · descrizione · frase del nonno · potere ---- */
  'Yggdrasil': 'Иггдрасиль',
  'A tree so tall the clouds snag in its branches.': 'Дерево такое высокое, что облака цепляются за ветви.',
  'I slept under it for a week. I never rested better.': 'Я спал под ним неделю. Лучше не отдыхал никогда.',
  'Root rest: energy fully restored.': 'Отдых у корней: энергия полностью восстановлена.',
  'The Menhir Circle': 'Круг менгиров',
  'Stones twice your height, set in a ring by ancient hands.':
    'Камни вдвое выше тебя, поставленные кольцом древними руками.',
  'The stones point to other stones. Try it: listen to where they pull.':
    'Камни указывают на другие камни. Попробуй: прислушайся, куда тянет.',
  'Stone echo: reveals nearby wonders on the map.': 'Каменное эхо: показывает чудеса поблизости на карте.',
  'The Hay Giant': 'Соломенный великан',
  'A colossus of hay bales with two apples for eyes.': 'Колосс из тюков соломы с двумя яблоками вместо глаз.',
  'The farmers rebuild it every year. They hide lunch inside.':
    'Крестьяне складывают его каждый год. Внутри они прячут обед.',
  'Feast supplies: 3 snacks in your bag.': 'Праздничные припасы: 3 перекуса в рюкзак.',
  'The Bone Arch': 'Костяная арка',
  'Two ribs the size of trees, crossed into an arch you can walk under.':
    'Два ребра размером с дерево, сложенные в арку, под которой можно пройти.',
  'The arches call to each other. Walk through one thinking of another.':
    'Арки зовут друг друга. Пройди сквозь одну, думая о другой.',
  'Passage: travel to another discovered arch.': 'Переход: перенос к другой найденной арке.',
  'The Bone Oasis': 'Костяной оазис',
  'Fresh water among the dunes, palms and a huge skull casting shade.':
    'Пресная вода среди дюн, пальмы и огромный череп, дающий тень.',
  'Drink, fill your flask and rest. The desert does not forgive haste.':
    'Пей, наполни флягу и отдохни. Пустыня не прощает спешки.',
  'Fresh water: energy fully restored.': 'Свежая вода: энергия полностью восстановлена.',
  'No raw finds to ship': 'Нет сырых находок для отправки',




  'No raw finds': 'Нет сырых находок',
  'Dig first, then come back to ship.': 'Сначала покопай, потом вернись отправить.',
  'raw finds': 'сырых находок',
  'cost': 'цена',
  'ready tomorrow': 'готово завтра',
  'Ship': 'Отправить',
  'Mailbox': 'Почтовый ящик',
  'The Dragon Skeleton': 'Скелет дракона',
  'One of the children of Neladan, the mightiest dragon that lived thousands of years ago: now bones in the sand, wings spread one last time.':
    'Одно из дитя Неладана, самого могущественного дракона, жившего тысячи лет назад: теперь лишь кости в песке, крылья раскрыты в последний раз.',
  'Under its ribs the sand is untouched: the finds there are always good.':
    'Под его рёбрами песок нетронут: находки там всегда хорошие.',
  'Sheltered dig: 3 fine finds.': 'Раскопки в укрытии: 3 отличные находки.',
  'The Fairy Ring': 'Ведьмин круг',
  'A perfect ring of mushrooms that glow green at night.':
    'Идеальный круг грибов, светящихся ночью зелёным.',
  'Spores on your spade bring luck. Do not ask me why.':
    'Споры на лопате приносят удачу. Не спрашивай почему.',
  'Lucky spores: better odds of a find for 10 digs.': 'Счастливые споры: повышенный шанс находки на 10 раскопок.',
  'The Hollow Stump': 'Полый пень',
  'The stump of an enormous tree: you can stand inside it.':
    'Пень огромного дерева: внутри можно встать во весь рост.',
  'I hid things there I did not want to lose. Look well inside the hollow.':
    'Я прятал там то, что не хотел потерять. Загляни хорошенько внутрь.',
  'Hiding place: a forgotten rare find.': 'Тайник: забытая редкая находка.',
  'The Ashen Totem': 'Пепельный тотем',
  'A pole carved with the faces of creatures that no longer exist.':
    'Столб с вырезанными лицами существ, которых больше нет.',
  'Whoever carved it had seen them. Look at the faces: they are accurate.':
    'Тот, кто его вырезал, их видел. Посмотри на лица: всё точно.',
  'Blessing: double experience for 10 digs.': 'Благословение: двойной опыт на 10 раскопок.',
  'The Red Geyser': 'Красный гейзер',
  'A blast of scalding steam that hurls stones into the sky.':
    'Столб обжигающего пара, подбрасывающий камни в небо.',
  'When it erupts it brings up buried things. You just have to be there.':
    'При извержении он выносит наверх погребённое. Надо просто оказаться рядом.',
  'Eruption: spits out 2 finds from deep down.': 'Извержение: выбрасывает 2 находки из глубины.',
  'The Red Arch': 'Красная арка',
  'Rock carved by the wind into a doorway onto the sky.':
    'Скала, выточенная ветром в дверь, ведущую в небо.',
  'This one is an arch too. This one takes you far as well.':
    'Это тоже арка. И она тоже уносит далеко.',
  'The Bright Vein': 'Светлая жила',
  'A vein of crystal crossing the rock like frozen lightning.':
    'Кристальная жила пересекает скалу, как застывшая молния.',
  'The pickaxe sings here. Three strikes, then let the stone rest.':
    'Здесь кирка поёт. Три удара — и дай камню отдохнуть.',
  'Vein: 3 rock finds (pickaxe needed).': 'Жила: 3 каменные находки (нужна кирка).',
  'The Ancient Willow': 'Древняя ива',
  'Branches touching the water like a green curtain.':
    'Ветви касаются воды, как зелёный занавес.',
  'Under that willow I slept and dreamed the creatures alive.':
    'Под этой ивой я спал, и мне снились живые существа.',
  'Willow sleep: sleep until dawn.': 'Сон под ивой: спать до рассвета.',
  'The Giant Lily Pads': 'Гигантские кувшинки',
  'Leaves as wide as rafts, still on the black water.':
    'Листья шириной с плот, неподвижные на чёрной воде.',
  'Under the leaves the water teems. Cast your line and wait.':
    'Под листьями вода кишит жизнью. Забрось удочку и жди.',
  'Rich waters: 2 water finds.': 'Богатые воды: 2 водные находки.',
  'The Bubbling Pool': 'Бурлящая заводь',
  'Bubbles rising from the depths, popping with an ancient smell.':
    'Пузыри поднимаются из глубины и лопаются с древним запахом.',
  'Every so often the marsh gives something back. Do not ask how.':
    'Время от времени болото что-то возвращает. Не спрашивай как.',
  'Upwelling: a find from the bottom.': 'Всплытие: находка со дна.',
  'The Ice Spire': 'Ледяной шпиль',
  'A blade of blue ice as tall as a tower.': 'Клинок голубого льда высотой с башню.',
  'From the top you can see very far. Climb slowly and look.':
    'С вершины видно очень далеко. Поднимайся медленно и смотри.',
  'Lookout: reveals a wide portion of the map.': 'Смотровая площадка: открывает большой участок карты.',
  'The Beast in the Ice': 'Зверь во льду',
  'The whole skeleton of a sabre-toothed beast, fossilised inside the blue ice.':
    'Целый скелет саблезубого зверя, окаменевший в голубом льду.',
  'I never managed to free it. You do it, one piece at a time.':
    'Мне так и не удалось его освободить. Сделай это ты, по кусочку.',
  'Free it: one piece of the same species each time.': 'Освобождение: по одной части того же вида за раз.',
  'The Aurora': 'Северное сияние',
  'Ribbons of green light waving above the snow.': 'Ленты зелёного света колышутся над снегом.',
  'Under the aurora I understood which creature to seek next. Look up.':
    'Под сиянием я понял, какое существо искать дальше. Подними глаза.',
  'Vision: reveals an unseen species in the Book (at night only).':
    'Видение: открывает в Книге неизвестный вид (только ночью).',


  /* ---- LETTERE DEL NONNO ---- */
  'Where it all began': 'С чего всё началось',
  'If you are reading this, you filled the first room. Well done.':
    'Если ты это читаешь, значит, первый зал заполнен. Молодец.',
  'On these meadows I found my first bone. I was your age and nobody believed me:':
    'На этих лугах я нашёл свою первую кость. Мне было столько же лет, и мне никто не верил:',
  'they said they were odd stones, that the great creatures had never existed.':
    'говорили, что это странные камни и что великих существ никогда не было.',
  'I spent my life proving otherwise, one room at a time.':
    'Я всю жизнь доказывал обратное — зал за залом.',
  'Keep digging. What matters is always underneath.':
    'Продолжай копать. Самое важное всегда лежит внизу.',
  'The first whole one': 'Первый целый',
  'In the dunes I found the first WHOLE creature. It took me two seasons.':
    'В дюнах я нашёл первое ЦЕЛОЕ существо. На это ушло два сезона.',
  'The wind would uncover a bone and bury it again the next day: a bitter joke.':
    'Ветер открывал кость и на следующий день снова её засыпал: злая шутка.',
  'When I finally saw all of it, laid out in the sand, I sat down and wept.':
    'Когда я наконец увидел его целиком, выложенным на песке, я сел и заплакал.',
  'Not from exhaustion: because for a moment I understood how alive it had been.':
    'Не от усталости: на миг я понял, каким живым оно было.',
  'The ash': 'Пепел',
  'You must have wondered why these woods are grey. Under the soil there is a layer of ash,':
    'Ты, наверное, гадал, почему эти леса серые. Под почвой лежит слой пепла,',
  'thin as a sheet of paper, and above that line you find nothing at all.':
    'тонкий, как лист бумаги, и выше этой черты не находится ровно ничего.',
  'Below it: a thousand creatures. Above it: silence.':
    'Ниже — тысяча существ. Выше — тишина.',
  'I still do not know what happened. Maybe you will find out.':
    'Я так и не узнал, что случилось. Может быть, узнаешь ты.',
  'The first awakening': 'Первое пробуждение',
  'In the Red Lands I understood that bones keep more than a shape.':
    'В Красных Землях я понял, что кости хранят больше, чем форму.',
  'A thread of life, inside. The Curator calls it DNA; I called it stubbornness.':
    'Внутри — нить жизни. Хранитель зовёт это ДНК; я называл это упрямством.',
  'The first creature that moved again looked at me for three seconds,':
    'Первое существо, которое снова задвигалось, смотрело на меня три секунды,',
  'then went to drink. Three seconds worth a lifetime of work.':
    'а потом пошло пить. Три секунды, ради которых стоило работать всю жизнь.',
  'The doubt': 'Сомнение',
  'In the marsh I stopped for a long time. Not because of the mud: because of a question.':
    'На болоте я надолго остановился. Не из-за грязи: из-за вопроса.',
  'Do we have the right to bring them back? The world they knew is gone.':
    'Имеем ли мы право их возвращать? Мира, который они знали, больше нет.',
  'Then I saw the first chimera run across the park, happy as a puppy,':
    'А потом я увидел, как первая химера носится по парку, радостная, как щенок,',
  'and I decided the answer was yes — as long as we treat them well.':
    'и решил, что ответ — да, пока мы обращаемся с ними хорошо.',
  'The cold': 'Холод',
  'The Frozen Wastes are the farthest I ever managed to go.':
    'Ледяные Пустоши — самое далёкое место, куда я сумел добраться.',
  'Ice keeps everything: skin, eyes, the last meal. A museum that charges no ticket.':
    'Лёд хранит всё: кожу, глаза, последнюю трапезу. Музей без входного билета.',
  'I left that dig half finished, not by choice: my legs would not carry me anymore.':
    'Те раскопки я бросил на полпути не по своей воле: ноги перестали меня носить.',
  'If you got this far, you have already gone farther than I did. I am proud of you.':
    'Если ты добрался сюда, ты уже зашёл дальше меня. Я тобой горжусь.',
  'Beneath everything': 'Под всем этим',
  'I never told anyone about the caves, not even the Curator.':
    'О пещерах я не рассказывал никому, даже Хранителю.',
  'Down there the bones glow, and not because of the crystals: they glow on their own.':
    'Там внизу кости светятся, и не из-за кристаллов: они светятся сами.',
  'I believe the creatures sheltered there when the sky turned to ash.':
    'Думаю, существа укрылись там, когда небо обратилось в пепел.',
  'The last ones died in the dark, together. Bring them out into the light, you who can.':
    'Последние умирали в темноте, вместе. Вынеси их на свет — ты это можешь.',
  'The last letter': 'Последнее письмо',
  'Seven rooms. You filled them all, one by one, as I had dreamed of doing.':
    'Семь залов. Ты заполнил их все, один за другим, как мечтал я.',
  'I never looked for the creatures for glory: I looked for them because no one remembered them,':
    'Я искал существ не ради славы: я искал их потому, что о них никто не помнил,',
  'and a forgotten thing might as well have never existed.':
    'а забытое всё равно что никогда не существовало.',
  'Now there is a whole museum remembering them in my place. And there is you.':
    'Теперь вместо меня о них помнит целый музей. И ты.',
  'The rest of the world is still out there, full of soil to turn.':
    'Остальной мир по-прежнему там, и земли, которую стоит перевернуть, хватает.',
  'Go slowly, drink water, say hello to the Curator for me. — Grandpa':
    'Иди не спеша, пей воду, передавай привет Хранителю. — дедушка',

  /* ---- console: stress e minigioco (beta) ---- */
  'Measured frames: ': 'Измерено кадров: ',
  'Stress level ': 'Нагрузка, уровень ',
  ' creatures · ': ' существ · ',
  ' map blocks · ': ' блоков карты · ',
  ' digs': ' раскопок',
  'compressed save: ': 'сжатое сохранение: ',
  'go to a city park to see the creatures · `vanilla` to go back to normal':
    'зайдите в городской парк, чтобы увидеть существ · `vanilla` вернёт всё как было',
  'Value: ': 'Ценность: ',
  'Preparation table: brush the find by dragging your finger (or the mouse).':
    'Препараторский стол: очищайте находку, водя пальцем (или мышью).',
  'In game it opens at the MUSEUM, on ONE piece per hand-in and only from rare upwards.':
    'В игре он открывается в МУЗЕЕ, на ОДНОЙ находке за сдачу и только начиная с редких.',

  /* ---- impostazioni ---- */
  'Settings': 'Настройки',
  'Tips': 'Подсказки',
  'Tap to move': 'Идти по касанию',
  'Destination marker': 'Метка цели',

  /* ---- intro: come si guadagnano le prime monete (i primi tester non lo capivano) ---- */

  /* ---- zaino: lasciare a terra (bottone, non trascinamento) ---- */


  'Leave on the ground': 'Оставить на земле',
  'Leave': 'Выйти',


  /* ---- fusione dei doppioni ---- */
  'Fuse duplicates': 'Сплавить дубликаты',



  'same zone': 'та же зона',
  'Fuse 3': 'Сплавить 3',
  'Fusion complete!': 'Сплав готов!',
  'You need 3 identical pieces': 'Нужны 3 одинаковые части',

  /* ---- comando dupes ---- */
  'No species of that rarity here': 'Здесь нет видов такой редкости',
  'go to the Laboratory and press «Fuse 3»': 'идите в Лабораторию и нажмите «Сплавить 3»',

  /* ---- comandi a schermo: leva fissa, leva sotto il dito, tocco ---- */
  'Hand': 'Рука',
  '3 × ': '3 × ',

  /* ---- comandi col mouse (desktop) ---- */
  'Click to move': 'Клик — идти туда',
  'Follow the pointer': 'Идти за курсором',
  'Keyboard only': 'Только клавиатура',

  /* ---- pagina Comandi: console ---- */
  'Console': 'Консоль',


  /* ---- DNA: 2 fialette risvegliano, 1 basta per una chimera ---- */



  'This is where things get awakened: with TWO vials of the same species I can bring it back whole. Chimeras, though, don\'t come from bones — breed TWO creatures you already have, and choose who each part is inherited from.':
    'Здесь пробуждают: с ДВУМЯ пробирками одного вида я верну его целиком. А химеры не рождаются из костей — скрестите ДВУХ существ, которые у вас уже есть, и выберите, от кого унаследована каждая часть.',
  'Bring me your RAW finds and I identify them right away. New pieces stay on display; complete a case (5 of 5) and you earn a DNA vial — the Laboratory needs two of them to bring a species back.':
    'Несите мне НЕОБРАБОТАННЫЕ находки — определю сразу. Новые части останутся в экспозиции; соберите витрину (5 из 5) и получите пробирку ДНК — Лаборатории нужны две, чтобы вернуть вид к жизни.',

  /* ---- abilità del compagno ---- */

  /* ---- descrizioni delle zone ---- */
  'Golden grasslands: the calmest place for your first digs.':
    'Золотые луга: самое спокойное место для первых раскопок.',
  'Bone sand and cacti: finds hidden under the dunes.':
    'Костяной песок и кактусы: находки прячутся под дюнами.',
  'Dark ashen woods: mushrooms, stumps and bones among trees.':
    'Тёмные пепельные леса: грибы, пни и кости среди деревьев.',
  'Arid red lands: rock spires and crystals to break.':
    'Сухие красные земли: каменные шпили и кристаллы, которые можно разбить.',
  'Ancient marsh: reeds, murky water and strange creatures.':
    'Древнее болото: тростник, мутная вода и странные существа.',
  'Frozen wastes: ice, snowy pines and rare fossils.':
    'Ледяные пустоши: лёд, заснеженные сосны и редкие ископаемые.',

  /* ---- Laboratorio ---- */
  'Skull, ribcage, leg… and I build you a creature good as new!':
    'Череп, грудная клетка, лапа… и я соберу тебе существо как новенькое!',
  "Ah, fresh material? Let's see what comes out.": 'О, свежий материал? Посмотрим, что выйдет.',
  'My chimeras need good parts, you know?': 'Моим химерам нужны хорошие части, знаешь ли.',
  'With a bit of DNA these old bones breathe again.': 'Немного ДНК — и старые кости снова дышат.',
  'I love the sound of bones clicking into place.': 'Обожаю звук костей, встающих на место.',
  'Bring me three parts and I work wonders, trust me.': 'Принеси мне три части — и я сотворю чудо, поверь.',
  'Each creature is a little experiment. What today?': 'Каждое существо — маленький эксперимент. Что сегодня?',
  'The park is full thanks to me… and a bit to you.': 'Парк полон благодаря мне… и немного благодаря тебе.',
  'Careful not to mix the wrong legs, heh heh.': 'Смотри не перепутай лапы, хе-хе.',
  'Life is all about the right fit. And DNA.': 'Всё дело в том, чтобы всё подошло. Ну и в ДНК.',

  /* ---- Negozio ---- */
  "Welcome! Take a look, I've got a bit of everything.": 'Добро пожаловать! Осмотрись, у меня есть всего понемногу.',
  "Finds to sell? I'm all ears.": 'Есть находки на продажу? Весь во внимании.',
  "I've got brand-new tools, if you need them.": 'Есть совсем новые инструменты, если нужно.',
  'Treasure maps sell like hotcakes, you know?': 'Карты сокровищ разлетаются как горячие пирожки.',
  'A good deal is never turned down.': 'От хорошей сделки не отказываются.',
  'Browse at your leisure, no rush.': 'Смотри спокойно, торопиться некуда.',
  'Ah, a customer! My day just got better.': 'О, покупатель! День сразу стал лучше.',
  'Need a boat? Or maybe a bike?': 'Нужна лодка? Или, может, велосипед?',
  'Every item has its price, and its reason.': 'У каждой вещи своя цена и свой смысл.',
  'Find something rare and I pay well.': 'Найдёшь что-то редкое — заплачу хорошо.',

  /* ---- Museo ---- */
  "Ah, new finds? Hand them over, I'll sort them out.": 'О, новые находки? Давай сюда, я разберусь.',
  'The museum grows one piece at a time.': 'Музей растёт по одной находке за раз.',
  'Every fossil tells an ancient story.': 'Каждое ископаемое рассказывает древнюю историю.',
  'Complete cases are my joy.': 'Полные витрины — моя радость.',
  'Come, come, show me what you found.': 'Проходи, проходи, покажи, что нашёл.',
  "One day we'll fill every hall, you'll see.": 'Однажды мы заполним все залы, вот увидишь.',
  'These finds deserve a place of honor.': 'Эти находки достойны почётного места.',
  'Science thanks you, young one.': 'Наука благодарит тебя, юный друг.',
  'That collection is nearly complete.': 'Та коллекция почти собрана.',
  'With patience, the past comes back to life.': 'С терпением прошлое оживает.',

  /* ---- Locanda ---- */
  "A good night's sleep and you're back in shape!": 'Хорошо выспишься — и снова в форме!',
  'The bed is ready whenever you like.': 'Кровать готова в любое время.',
  "It's rough out there, cozy in here.": 'Снаружи сурово, а здесь уютно.',
  'Rest up, the world can wait.': 'Отдохни, мир подождёт.',
  'Warm fire, warm blankets: what more could you want?': 'Тёплый огонь, тёплые одеяла — что ещё нужно?',
  'Even explorers must sleep, you know?': 'Даже исследователям надо спать, знаешь ли.',
  'A hot tea and then off to bed?': 'Горячий чай — и на боковую?',
  'The best room is yours, guest.': 'Лучшая комната твоя, гость.',
  'You dig better tomorrow, well rested.': 'Отдохнув, завтра копать будешь лучше.',
  'Time runs slow here. Relax.': 'Здесь время идёт медленно. Расслабься.',

  /* ---- Barbiere ---- */
  "Have a seat, I'll sort out your hair.": 'Присаживайся, приведу твои волосы в порядок.',
  'What style shall we do today?': 'Какую причёску сделаем сегодня?',
  'A fresh cut changes your day, trust me.': 'Свежая стрижка меняет весь день, поверь.',
  "Chair's free, you're up!": 'Кресло свободно, твоя очередь!',
  'My scissors are itching, you know?': 'У меня ножницы так и чешутся.',
  'Something bold or classic?': 'Что-нибудь смелое или классику?',
  "I'll make you sharp for the adventure.": 'Сделаю тебя красавцем для приключений.',
  'Tidy hair, light head.': 'Аккуратные волосы — лёгкая голова.',
  'Look what a wonder I can do.': 'Смотри, какое чудо я умею.',
  'Sit down, in a blink you\'re a new person.': 'Садись — и глазом моргнуть не успеешь, как станешь другим человеком.',

  /* ---- Sartoria ---- */
  'Looking for something to wear? Right place.': 'Ищешь, что надеть? Ты по адресу.',
  "I've got fabrics of every color, look!": 'У меня ткани всех цветов, смотри!',
  "A new hat? I've got special ones.": 'Новая шляпа? Есть особенные.',
  'Clothes make the archaeologist, they say.': 'Говорят, одежда делает археолога.',
  'Try on anything you like.': 'Примеряй что угодно.',
  'Fresh fabrics, just in.': 'Свежие ткани, только привезли.',
  "You'd look great in something colorful.": 'Тебе бы пошло что-нибудь яркое.',
  'Good clothes bring good luck.': 'Хорошая одежда приносит удачу.',
  'Stitch stitch, and you\'re in fashion.': 'Стежок-другой — и ты по моде.',
  "Come, let's make you elegant for the museum.": 'Проходи, сделаем тебя элегантным для музея.',

  /* ---- congedi ---- */
  'Thank you, come back anytime!': 'Спасибо, заходи в любое время!',
  'Great choice, really.': 'Отличный выбор, правда.',
  'A pleasure!': 'С удовольствием!',
  'Until next time, take care.': 'До встречи, береги себя.',
  "I knew you'd like it.": 'Я знал, что тебе понравится.',
  'Deal done! See you soon.': 'Сделка есть! До скорого.',
  'Good luck out there!': 'Удачи там, снаружи!',
  'May your bag always be full.': 'Пусть рюкзак всегда будет полон.',
  'No problem, come back anytime.': 'Без проблем, заходи в любое время.',
  "Take your time, I'm always here.": 'Не спеши, я всегда здесь.',
  'Maybe next time!': 'Может, в другой раз!',
  "I'll be right here, you know.": 'Я буду здесь, знаешь ли.',
  "That's alright, happy exploring!": 'Ничего страшного, доброго исследования!',
  'The door is always open.': 'Дверь всегда открыта.',

  /* ---- cartelli d'ingresso degli edifici ---- */
  'Here you sell identified finds and buy what you need: tools, bigger bags, treasure maps, snacks and vehicles. Have a look around.':
    'Здесь продают определённые находки и покупают всё нужное: инструменты, рюкзаки побольше, карты сокровищ, перекусы и транспорт. Осмотрись.',
  "Sleep here to restore your energy: you'll wake at dawn the next day. Handy before a long dig.":
    'Здесь спят, чтобы восстановить энергию: проснётесь на рассвете следующего дня. Удобно перед долгими раскопками.',
  'Here you pick shirt, trousers, hat and glasses. Try freely and pay on confirm; some special hats are unlocked separately.':
    'Здесь выбирают рубашку, штаны, шляпу и очки. Примеряйте свободно, платите при подтверждении; некоторые особые шляпы открываются отдельно.',

  /* ---- intro: le prime battute ---- */



  /* ---- comandi: col mouse si gioca senza tastiera ---- */


  /* ---- uscita dagli interni ---- */
  /* ---- partita in cloud e zaino pieno in grotta ---- */
  'Picked up your saved game (': 'Загружена сохранённая игра (',
  "Kept this device's game (": 'Оставлена игра с этого устройства (',

  'Sign in with Google': 'Войти через Google',
  'This address is not authorised with Google: ': 'Этот адрес не разрешён в Google: ',



  'What happens to your data': 'Что происходит с твоими данными',



  /* ---- statistiche, conferme, museo ---- */
  'Bag full: ': 'Рюкзак полон: ',

  'Overwrite': 'Перезаписать',
  'Time played': 'Время в игре',
  'Species discovered': 'Открыто видов',
  'Complete cases': 'Полных витрин',
  'Species awakened': 'Пробуждено видов',
  'Chimeras created': 'Создано химер',
  'Wonders found': 'Найдено чудес',
  'Caves explored': 'Исследовано пещер',
  'Tiles dug': 'Раскопано клеток',
  'Missions delivered': 'Выполнено заданий',
  'species': 'видов',
  /* ---- impostazioni rifatte ---- */
  'Stats': 'Статистика',
  'd': 'д',
  'Controls': 'Управление',
  'On screen': 'На экране',
  'Version': 'Версия',
  'Update the game': 'Обновить игру',


  'Tap a spot and Digsy walks there.': 'Коснись точки — и Дигси туда пойдёт.',






  'Right': 'Правая',
  'Left': 'Левая',
  /* ---- installazione come app ---- */
  'Install Digsy': 'Установить Digsy',
  'Install now': 'Установить сейчас',
  "Full-screen and <b>works offline</b>.": "На весь экран и <b>без интернета</b>.",
  'tap <b>Share</b> at the bottom': 'нажми <b>Поделиться</b> внизу',
  'scroll and tap <b>Add to Home Screen</b>': 'прокрути и нажми <b>На экран «Домой»</b>',
  'confirm with <b>Add</b>': 'подтверди кнопкой <b>Добавить</b>',
  'On iPhone you need Safari.': 'На iPhone нужен Safari.',

  'Then, in Safari:': 'Затем, в Safari:',
  'Install on device': 'Установить на устройство',
  'Done': 'Готово',
  'How': 'Как',


  'Anonymous stats': 'Анонимная статистика',


  /* ---- casa: sblocco stanze (M2, corridoio con stanze ai lati) ---- */

  'Room': 'Комната',
  'Unlock': 'Открыть',
  'Unlocked: ': 'Открыто: ',
  'Living room': 'Гостиная',
  'Kitchen': 'Кухня',
  'Bathroom': 'Ванная',
  'Bedroom': 'Спальня',
  'gathers': 'собирает',
  "Can't land here: find open ground": "Здесь не сесть: найди свободное место",
  /* ---- casa: arredo (M3) ---- */
  'Furnish 🎨': 'Обставить 🎨',
  /* raccogli e ripiazza + rotazione (M4) */
  'Pick up ': 'Взять ',

  'Place here 🎨': 'Поставить сюда 🎨',
  'Hang it here 🎨': 'Повесить сюда 🎨', 'Wall pieces hang on the back wall': 'Картины вешаются на дальнюю стену',
  "It doesn't fit here": 'Здесь не помещается', 'Take down ': 'Снять ',
  'Placed!': 'Поставлено!',
  "Can't place it here": 'Здесь нельзя поставить',
  'Back in your tray': 'Вернулось в лоток',
  'Rotate': 'Повернуть',
  'Cancel': 'Отмена',



  'Take': 'Взять',
  'Drag it where you want · ↻ to rotate': 'Перетащи куда хочешь · ↻ чтобы повернуть',



  'Room backdrop': 'Фон комнаты', 'Apply': 'Применить', 'in use': 'используется',
  'wallpaper': 'обои', 'flooring': 'напольное покрытие', 'on the wall': 'на стене',
  '1 tile': '1 клетка', 'tiles': 'клетки', 'you walk on it': 'по нему можно ходить',
  'ROOM BACKDROP': 'ФОН КОМНАТЫ', 'FURNITURE AND DECOR': 'МЕБЕЛЬ И ДЕКОР', 'owned': 'уже твоё',

  'Furniture shop': 'Мебельная лавка',
  'furniture': 'мебель',
  'An empty house is a blank canvas. Shall we pick the colours?': 'Пустой дом — чистый холст. Подберём цвета?',
  'I planed every piece in here with these hands.': 'Каждую вещь здесь я выстрогал этими руками.',
  'There are new pieces on display today, have a look.': 'Сегодня на витрине новые вещи, взгляни.',
  'Wallpaper changes a room more than any wardrobe.': 'Обои меняют комнату сильнее любого шкафа.',
  'Mind the wood shavings, they get everywhere.': 'Осторожно со стружкой, она повсюду.',
  'A good bed and you sleep like a rock.': 'Хорошая кровать — и спишь как убитый.',
  "This area's style costs less, and it shows.": 'Стиль этих мест стоит дешевле, и это видно.',
  'A room all in one style is cosier.': 'Комната в одном стиле уютнее.',
  'Measure first: a bed takes two tiles.': 'Сначала измерь: кровать занимает две клетки.',
  "Tell me what room you have in mind and I'll advise.": 'Скажи, какую комнату задумал, и я подскажу.',
  "Everything for your home is here: furniture, pictures, rugs, wallpaper and floors. Pick a topic; new pieces arrive every day, and this area's style is a quarter cheaper.": 'Здесь всё для дома: мебель, картины, ковры, обои и полы. Выбери раздел; каждый день приходят новые вещи, а стиль этих мест на четверть дешевле.',
  'Furniture tray': 'Лоток с мебелью',
  /* piedistallo (M4) */
  'Pedestal 🏛️': 'Постамент 🏛️', 'Pedestal': 'Постамент', 'Empty pedestal': 'Пустой постамент',
  'Change species': 'Сменить вид', 'Remove pedestal': 'Убрать постамент', 'Display': 'Выставить',


  /* nomi dell'arredo per zona (furnLabel, data.js FURN_SETS) */
  'Daisy rug': 'Ромашковый коврик', 'Flower bed': 'Цветочная кровать',
  'Straw table': 'Соломенный стол', 'Wheat lantern': 'Пшеничный фонарь',
  'Sand rug': 'Песочный коврик', 'Bedouin bedroll': 'Бедуинская подстилка',
  'Bone chest': 'Костяной сундук', 'Potted cactus': 'Кактус в горшке',
  'Moss rug': 'Моховой коврик', 'Log bed': 'Кровать из бревна',
  'Bark armchair': 'Кресло из коры', 'Mushroom lamp': 'Грибная лампа',
  'Clay rug': 'Глиняный коврик', 'Red rock bed': 'Кровать из красной скалы',
  'Stone throne': 'Каменный трон', 'Ornamental crystal': 'Декоративный кристалл',
  'Algae rug': 'Коврик из водорослей', 'Reed hammock': 'Гамак из тростника',
  'Water lily vase': 'Ваза с кувшинками', "Will-o'-wisp lantern": 'Фонарь с блуждающим огоньком',
  'Fur rug': 'Меховой коврик', 'Fur bed': 'Меховая кровать',
  'Glacial hearth': 'Ледниковый очаг', 'Ice lantern': 'Ледяной фонарь',
  /* letto di casa e comodità della stanza */
  'Well rested: your next ': 'Хорошо отдохнул: следующие ',
  ' efforts cost no energy': ' действий не тратят энергию',


  'comfort': 'уют', ' bare': ' пустая', ' cosy': ' уютная', ' well kept': ' ухоженная', ' picture perfect': ' как с картинки',
  'sleeping here your next ': 'если спать здесь, следующие ',

  'To make it comfier': 'Чтобы стало уютнее',
  'more furniture (up to 4 counts)': 'больше мебели (считаются до 4)',
  'something on the floor (a rug)': 'что-то на полу (коврик)',
  'something on the wall': 'что-то на стене',
  'pieces all from one zone': 'все предметы из одной зоны',
  'Sleep': 'Спать', 'Not sleepy yet': 'Ещё не хочется спать',

  'Move the bed': 'Передвинуть кровать',

  /* fondi della stanza (carta da parati e pavimento) e pezzi da parete */
  'This piece looks the same from every side: it does not turn': 'Этот предмет одинаков со всех сторон: его не повернуть',
  'Wheat wallpaper': 'Пшеничные обои', 'Wheat boards': 'Пшеничные доски',
  'Sand wallpaper': 'Песчаные обои', 'Pale sandstone': 'Светлый песчаник',
  'Fern wallpaper': 'Папоротниковые обои', 'Oak boards': 'Дубовые доски',
  'Clay wallpaper': 'Глиняные обои', 'Red terracotta': 'Красная терракота',
  'Reed wallpaper': 'Тростниковые обои', 'Bog boards': 'Болотные доски',
  'Frost wallpaper': 'Морозные обои', 'Ice slabs': 'Ледяные плиты',
  'Wheat wreath': 'Пшеничный венок', 'Wall skull': 'Череп на стене',
  'Mushroom shelf': 'Грибная полка', 'Clay painting': 'Глиняная картина',
  'Hanging lily': 'Подвесная кувшинка', 'Ice mirror': 'Ледяное зеркало',
  /* cancello del cortile chiuso a chiave dal teletrasporto */
  "Whoa! It's locked from outside!!": 'Ого! Заперто снаружи!!',
  'You reopen the gate': 'Ты снова открываешь калитку',
  /* comando godfurn (tono in gioco) */
  'furniture pieces added to your tray: place them at home': 'предметов мебели добавлено в лоток: расставь их дома',
  /* backlog di stringhe ancora in inglese, trovate dal test di copertura */
  'water': 'вода',
  'Fixed stick': 'Неподвижный джойстик', 'Stick under finger': 'Джойстик под пальцем',


  'day': 'день',
  'Teleport back 🌀': 'Телепорт назад 🌀',
  'Drag to rotate': 'Потяни, чтобы повернуть',
  'Awaken a species': 'Оживи вид',

  /* ---- guardaroba (quello che hai comprato resta tuo) ---- */
  'already yours': 'уже ваше',
  'costs ': 'стоит ',
  'Free: already yours': 'Бесплатно: уже ваше',
  'free': 'бесплатно',

  /* ---- in compagnia ---- */
  'Play together': 'Играть вместе',
  'Together': 'Вместе',
  "You're in the room": 'Вы в комнате',
  'Connecting…': 'Подключаюсь…',
  'Connection lost': 'Связь потеряна',
  'Not connected': 'Нет подключения',
  'With you': 'С вами',
  /* il sonno in compagnia: chi dorme sogna e aspetta */
  'in the morning': 'утром',
  'at night': 'ночью',
  "You're asleep": 'Ты спишь',
  'Waiting for ': 'Ждёшь: ',
  'Everyone is asleep: the night is passing': 'Все спят: ночь проходит',
  'Wake up ': 'Проснуться ',
  'Wake up': 'Проснуться',
  'Get up: nothing happened': 'Встать: ничего не произошло',
  'Time passes for everyone. Whoever did not sleep gets no energy back.': 'Время идёт для всех. Кто не спал, энергию не восстановит.',
  'Time here belongs to your host: the night passes when they say so.': 'Здесь время принадлежит хозяину: ночь пройдёт, когда он решит.',
  "Time passed, but you didn't sleep: no energy back": 'Время прошло, но ты не спал: энергии нет',
  'Kick out': 'Выгнать',
  'Moved faster than the game allows': 'Двигался быстрее, чем позволяет игра',
  'Nobody yet: pass the code to someone': 'Пока никого: дайте кому-нибудь код',
  'Press T to talk': 'Нажмите T, чтобы говорить',
  'Leave the room': 'Выйти из комнаты',
  'Join': 'Войти',
  'Whoever opens the room first is the host: you play in their world, on their clock.':
    'Кто открыл комнату первым — тот хозяин: играете в его мире и по его часам.',
  "It's their home: look, don't touch": 'Это их дом: смотрите, но не трогайте',
  'The clock here belongs to your host': 'Здесь часами распоряжается хозяин',
  'Say something…': 'Напишите что-нибудь…',
  'Send': 'Отправить',
  'Notebook': 'Блокнот',
  "Nothing yet. What you say to each other stays here.": 'Пока пусто. Здесь остаётся всё, что вы друг другу сказали.',
  'Who you talked to, most recent first': 'С кем вы говорили, сначала недавние',
  'Tear up the whole notebook': 'Порвать весь блокнот',
  'All conversations': 'Все разговоры',
  'Tear up this page': 'Порвать эту страницу',
  'Room code — make one up and tell whoever you want to invite': 'Код комнаты — придумайте его и скажите тому, кого хотите позвать',
};
