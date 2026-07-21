/* RUSSO — dizionario chiave INGLESE → russo.
   Le 669 chiamate `tr(it, en)` sparse nel codice non si toccano: qui si aggiunge solo la
   traduzione della stringa inglese. Chiave assente = si vede l'inglese (mai vuoto).

   REGOLE per chi corregge:
   - gli SPAZI iniziali e finali contano: molte stringhe vengono concatenate a numeri e nomi
     (" steps" → " шагов"), toglierli attacca le parole;
   - i tag <b> <kbd> <br> e le emoji vanno lasciati dove sono;
   - i nomi propri (specie, città, chimere) NON si traducono: sono inventati e restano uguali.
   Il test `npm test` controlla spazi e tag: se sbagli, fallisce e dice quale riga. */
export const RU = {
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
  'Bones not yet reconstructed. Dig in the ': 'Кости ещё не собраны. Копайте в зоне ',
  ' and take your finds to the Laboratory.': ' и несите находки в Лабораторию.',
  'In trees (hatchet)': 'В деревьях (топор)',
  'In rocks (pickaxe)': 'В камнях (кирка)',
  'In water (boat)': 'В воде (лодка)',
  'Underground': 'Под землёй',
  'Owned': 'В наличии',
  'Awakened': 'Пробуждён',
  'Bring all 5 pieces to the Laboratory': 'Принесите все 5 частей в Лабораторию',
  '5 pieces': '5 частей',
  'The book is empty': 'Книга пуста',
  "Visit a zone's <b>Museum</b> to index its fossils,<br>then dig and identify to complete the pages.":
    'Посетите <b>Музей</b> зоны, чтобы внести её ископаемых в каталог,<br>затем копайте и определяйте находки, чтобы заполнить страницы.',
  'to index': 'для каталога',
  'Skeleton': 'Скелет',

  /* ---- grotte ---- */
  'NEW WING: DEEP CAVES': 'НОВОЕ КРЫЛО: ГЛУБОКИЕ ПЕЩЕРЫ',
  'the Museum now has a room for cave fossils': 'в Музее появился зал для пещерных ископаемых',
  'Cave fossil! (rare — needs identifying)': 'Пещерное ископаемое! (редкое — нужно определить)',
  '…just a dull crystal': '…всего лишь тусклый кристалл',
  'You need the pickaxe to get in (Shop)': 'Чтобы войти, нужна кирка (Магазин)',
  'Cave': 'Пещера',

  /* ---- console dei comandi ---- */
  'CHEATS on: saving is FROZEN. Type `vanilla` to go back to normal.':
    'ЧИТЫ включены: сохранение ЗАМОРОЖЕНО. Введите `vanilla`, чтобы вернуться к обычной игре.',
  'Dig site': 'Место раскопок',
  'Wreck (E to search)': 'Обломки (E — обыскать)',
  'Coins: ': 'Монеты: ',
  'Energy: ': 'Энергия: ',
  'Day ': 'День ',
  'Seasons: spring, summer, autumn, winter (0-3)': 'Сезоны: весна, лето, осень, зима (0-3)',
  'Speed ×': 'Скорость ×',
  'GODMODE: all unlocked, infinite, ×5, fly': 'РЕЖИМ БОГА: всё открыто, бесконечно, ×5, полёт',
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
  'Seen everything around — reset, run tour again': 'Вокруг всё осмотрено — сброшено, запустите тур снова',
  'Replaying intro…': 'Повтор вступления…',
  'All achievements unlocked!': 'Все достижения открыты!',
  'auto weather': 'погода автоматически',
  'weather: rain/sandstorm/fog/ash/snow/clear/off': 'погода: дождь/песчаная буря/туман/пепел/снег/ясно/выкл',
  'Fly ON': 'Полёт ВКЛ',
  'Fly OFF': 'Полёт ВЫКЛ',
  'Vanilla: cheats removed, save restored': 'Vanilla: читы убраны, сохранение восстановлено',
  'Available commands:\n': 'Доступные команды:\n',
  'Unknown command: ': 'Неизвестная команда: ',
  'Use: ': 'Использование: ',
  'Number expected': 'Ожидается число',

  /* ---- commissione del museo ---- */
  'pieces of ': 'частей вида ',
  'finds': 'находок',
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
  'You need a spade (Shop)': 'Нужна лопата (Магазин)',
  "You can't dig here": 'Здесь копать нельзя',
  'Already dug here': 'Здесь уже копали',
  'Out of energy — rest at the Inn': 'Нет энергии — отдохните в Таверне',
  'The X was true! A ': 'Крестик не обманул! Находка: ',
  ' find (needs identifying)': ' (нужно определить)',
  'Raw find unearthed! (needs identifying)': 'Найдена необработанная находка! (нужно определить)',
  '…just dirt': '…просто земля',
  'The lucky shovel wore out': 'Счастливая лопатка износилась',
  'Spade: now you can dig the ground ': 'Лопата: теперь можно копать землю ',
  'Hatchet: chop trees ': 'Топор: рубите деревья ',
  'Pickaxe: break boulders and spires ': 'Кирка: разбивайте валуны и шпили ',
  'Boat: walk onto water and sail! (E to fish)': 'Лодка: заходите в воду и плывите! (E — рыбалка)',
  'Skates: move at double speed': 'Коньки: скорость ×2',
  'Bicycle: triple speed on foot': 'Велосипед: скорость ×3 по суше',
  'Motorboat: triple speed on water': 'Моторка: скорость ×3 по воде',
  'Torch: wider light halo (night and caves)': 'Факел: шире круг света (ночь и пещеры)',
  'You already own it': 'У вас это уже есть',
  'You need the boat first': 'Сначала нужна лодка',
  'Lucky shovel: +60 boosted digs': 'Счастливая лопатка: +60 удачных раскопок',
  'Bought': 'Куплено',
  'You are on the water: get back to shore first': 'Вы на воде: сначала вернитесь на берег',
  'Return scroll in your bag': 'Свиток возврата в рюкзаке',
  'No scrolls': 'Свитков нет',
  'Teleported to ': 'Перемещение в ',
  'No museum city found nearby': 'Поблизости нет города с музеем',
  '…the vein is silent this season': '…в этот сезон жила молчит',
  '…nothing': '…ничего',
  '…just wood chips': '…только щепки',
  '…just rubble': '…только щебень',
  '…just rubble. This vein opens in ': '…только щебень. Эта жила открывается в сезон: ',
  'Among the roots: a find! (needs identifying)': 'Среди корней — находка! (нужно определить)',
  'You need the hatchet (Shop)': 'Нужен топор (Магазин)',
  'Inside the rock: a find! (needs identifying)': 'Внутри камня — находка! (нужно определить)',
  'You need the pickaxe (Shop)': 'Нужна кирка (Магазин)',
  'An aquatic fossil! (needs identifying)': 'Водное ископаемое! (нужно определить)',
  '…nothing. At night, though, this water stirs differently':
    '…ничего. А вот ночью эта вода ведёт себя иначе',
  '…nothing bites': '…не клюёт',
  '🪙 Plink! …just ripples': '🪙 Плюх! …только круги по воде',
  '✨ The fountain grants you a ': '✨ Фонтан дарит вам: ',
  'Boost your luck': 'Испытай удачу',
  'Land the toss in the golden ripple': 'Останови бросок в золотом отблеске',
  'Nice throw!': 'Хороший бросок!',
  'Wow, well done!': 'Ух ты, отлично!',
  'Three in a row — here\'s your prize!': 'Три из трёх — вот твой приз!',
  'Too bad — let\'s see if luck rewards you!': 'Жаль — посмотрим, наградит ли удача!',
  'Pick up from the ground ✨': 'Подними с земли ✨',
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
  'Site exhausted: only crumbled bones': 'Место исчерпано: только раскрошенные кости',
  '⛏️✨ Precious find from the site! (': '⛏️✨ Ценная находка на раскопках! (',
  ' left)': ' осталось)',
  'Picked up: ': 'Подобрано: ',
  'Bag full: free some space first': 'Рюкзак полон: сначала освободите место',
  'Picked up from the ground': 'Подобрано с земли',
  'Left on the ground': 'Оставлено на земле',
  'Wreck picked clean': 'Обломки обчищены',
  'Find from the wreck! (': 'Находка из обломков! (',
  'You need the pickaxe to break the crystals (Shop)': 'Чтобы разбить кристаллы, нужна кирка (Магазин)',
  'Get close to a glowing deposit': 'Подойдите к светящейся жиле',
  ' (bag full: the rest is on the ground)': ' (рюкзак полон: остальное на земле)',
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
  'Lucky spores: 10 digs with doubled finds': 'Счастливые споры: 10 раскопок с удвоенной добычей',
  'Blessing: 10 digs with double XP': 'Благословение: 10 раскопок с двойным опытом',
  'Nothing happens': 'Ничего не происходит',

  /* ---- museo, laboratorio, locanda ---- */
  'Nothing to identify': 'Нечего определять',
  'The experts are already at work': 'Специалисты уже работают',
  'No raw finds to hand in': 'Нет необработанных находок для сдачи',
  'Spend at least half a day awake first': 'Сначала проведите хотя бы полдня на ногах',
  'Dawn of day ': 'Рассвет дня ',
  '! Full energy': '! Энергия полная',
  'Night falls. Full energy': 'Наступает ночь. Энергия полная',
  'The baker is out of snacks for today: come back tomorrow':
    'У пекаря на сегодня перекусы закончились: приходите завтра',
  'You need ': 'Нужно ',
  'Snack in your bag (I to use it)': 'Перекус в рюкзаке (I — съесть)',
  'No snacks in your bag': 'В рюкзаке нет перекусов',
  'Energy already full': 'Энергия уже полная',
  'Missing DNA of: ': 'Не хватает ДНК: ',
  ' (museum, case 5/5)': ' (музей, витрина 5/5)',
  'CHIMERA CREATED': 'ХИМЕРА СОЗДАНА',
  ' has woken up! It roams the big-city park': ' оживлена! Она гуляет в парке большого города',
  'SPECIES AWAKENED': 'ВИД ПРОБУЖДЁН',
  ' has been awakened! See it ALIVE in the Book (L)': ' пробуждён! Посмотрите на него ЖИВЫМ в Книге (L)',

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
  'Your grandparent left me one last envelope, to be opened only then.':
    'Ваш дед оставил мне последний конверт — открыть только тогда.',
  'I believe the moment has come. Sit down: read it slowly.':
    'Думаю, этот момент настал. Присядьте и читайте не спеша.',
  'Your grandparent left this years ago. They said: "give it to them once the room is full".':
    'Ваш дед оставил это много лет назад. Он сказал: «отдай, когда зал будет полон».',
  'I only kept the promise. The rest is written in there.':
    'Я лишь сдержал слово. Остальное написано внутри.',
  '…thank you, Grandpa.': '…спасибо, дедушка.',
  "I'll read it right away!": 'Прочту прямо сейчас!',
  'A LETTER FROM GRANDPA': 'ПИСЬМО ОТ ДЕДУШКИ',
  'Here are the Book pages of ': 'Вот страницы Книги для зоны ',
  '. Keep them safe.': '. Берегите их.',
  'I study whole fossils and extract their DNA: that is how creatures come back to life.':
    'Я изучаю целые скелеты и извлекаю ДНК: так существа возвращаются к жизни.',
  "If you find something you can't recognize, bring it to my desk: I'll identify it.":
    'Найдёте что-то незнакомое — несите ко мне на стойку, я определю.',
  'NEW BOOK DELIVERED': 'ПОЛУЧЕНА НОВАЯ КНИГА',
  'Pages of ': 'Страницы: ',
  'WONDER DISCOVERED': 'ОТКРЫТО ЧУДО',
  'Added to the Wonders in your Book': 'Добавлено в раздел «Чудеса» вашей Книги',
  '📅 Day ': '📅 День ',
  '🏛️ The Museum commission has expired': '🏛️ Заказ Музея просрочен',
  'Storage full: the game is NOT saving! Free some browser storage.':
    'Хранилище переполнено: игра НЕ сохраняется! Освободите место в браузере.',
  'Your browser blocks saving (private mode?): progress will not be kept.':
    'Браузер блокирует сохранение (режим инкогнито?): прогресс не сохранится.',

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
  'Brush: drag to dust it off — the pale fossil appears in the rock': 'Кисть: веди, чтобы смахнуть пыль — светлое ископаемое проступит в породе',
  'Chisel: drag on the dark ROCK to chip it away — don\'t touch the pale fossil': 'Зубило: веди по тёмной ПОРОДЕ, чтобы скалывать — не задевай светлое ископаемое',
  'Spatula: drag on the fossil to clean it — don\'t keep scraping bone that\'s already clean': 'Шпатель: веди по ископаемому, чтобы очистить — не скобли уже чистую кость',

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
  'Cheats on: type `vanilla`': 'Читы включены: введите `vanilla`',
  'Storage full!': 'Хранилище переполнено!',
  'Confirm?': 'Подтвердить?',
  'Sure?': 'Уверены?',

  /* ---- guida rapida ---- */
  'Digging': 'Раскопки',
  'Raw finds': 'Необработанные находки',
  'A raw find cannot be sold: bring it to the <b>Museum</b> and the Curator identifies it. Duplicates come back to you, new pieces stay on display.':
    'Необработанную находку нельзя продать: отнесите её в <b>Музей</b>, и Хранитель её определит. Дубликаты вернутся к вам, новые части останутся в экспозиции.',
  'Energy': 'Энергия',
  'When ⚡ runs out you cannot dig. Sleep at the <b>Inn</b> (free) or eat a snack from your bag (+15 ⚡).':
    'Когда ⚡ кончается, копать нельзя. Переночуйте в <b>Таверне</b> (бесплатно) или съешьте перекус из рюкзака (+15 ⚡).',
  'Bag full': 'Рюкзак полон',
  'Water': 'Вода',
  'Caves': 'Пещеры',
  'Caves are sealed by a boulder: you need the <b>pickaxe</b> to open one, get in and break the crystals. Inside live 6 species found nowhere else.':
    'Пещеры завалены валуном: нужна <b>кирка</b>, чтобы открыть проход, войти и разбить кристаллы. Внутри живут 6 видов, которых больше нигде нет.',
  'Wonders': 'Чудеса',
  'There are 18 wonders, three per biome. Each grants a different gift then rests for a few days: the time left is always written. Arches let you travel between them.':
    'Всего 18 чудес, по три на биом. Каждое даёт свой дар, а потом отдыхает несколько дней: оставшееся время всегда указано. Арки переносят от одной к другой.',
  'Map': 'Карта',
  'DNA and chimeras': 'ДНК и химеры',
  'Missions': 'Задания',
  "The town board shows the requests of the day. They expire at day's end and pay coins and experience.":
    'На городской доске вывешены заказы дня. Они сгорают в конце дня и приносят монеты и опыт.',
  'Night and seasons': 'Ночь и сезоны',
  'A day lasts 20 real minutes. At night you can barely see outside towns: the <b>torch</b> widens your halo. The season changes every 3 days.':
    'День длится 20 реальных минут. Ночью вне городов почти ничего не видно: <b>факел</b> расширяет круг света. Сезон меняется каждые 3 дня.',
  'Achievement: ': 'Достижение: ',

  /* ---- prompt sul campo ---- */
  'Dig the deposit ⛏️': 'Разбить жилу ⛏️',
  'Talk to the Master Digger 🎓': 'Поговорить с Мастером раскопок 🎓',
  'Talk to ': 'Поговорить: ',
  'Dig at the site ⛏️ (': 'Копать на раскопках ⛏️ (',
  'Site exhausted': 'Место исчерпано',
  'Mission board 📋': 'Доска заданий 📋',
  'Choose your companion 🐾': 'Выбрать спутника 🐾',
  'Toss 1 🪙 into the fountain': 'Бросить 1 🪙 в фонтан',
  'Search the wreck 🚢 (': 'Обыскать обломки 🚢 (',
  'Pick ': 'Подобрать ',
  'Pick up ✨': 'Подобрать ✨',
  'Joystick to move · A to interact · 📖 and 🎒 up top':
    'Джойстик — движение · A — действие · 📖 и 🎒 сверху',
  'WASD/arrows to move · E dig or enter · I bag · L book':
    'WASD/стрелки — движение · E — копать или войти · I — рюкзак · L — книга',

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
  'Delivered! +🪙 ': 'Сдано! +🪙 ',
  'Achievements unlocked': 'Достижений открыто',
  'Achievements': 'Достижения',

  /* ---- lettere del nonno ---- */
  '— Grandpa': '— дедушка',
  'Back to the letters': 'Назад к письмам',
  'Close': 'Закрыть',
  'A letter from Grandpa': 'Письмо от дедушки',
  'Grandpa left a letter for every room of the Museum. Fill a room (at least one piece of every species) and the Curator hands it to you.':
    'Дедушка оставил по письму для каждого зала Музея. Заполните зал (хотя бы по одной части каждого вида), и Хранитель отдаст письмо.',
  'tap to read it again': 'нажмите, чтобы перечитать',
  'once you have all the others': 'когда соберёте все остальные',
  'fill the room of ': 'заполните зал: ',

  /* ---- meraviglie: uso, archi, libro ---- */
  'usable once every ': 'можно использовать раз в ',
  ' days · ': ' дн. · ',
  'always available · ': 'доступно всегда · ',
  'Use': 'Использовать',
  'Wonder': 'Чудо',
  'The arches call to each other: walk through one thinking of another.':
    'Арки зовут друг друга: пройдите сквозь одну, думая о другой.',
  'You have not found another arch yet. Look for one far from here.':
    'Вы ещё не нашли вторую арку. Ищите её далеко отсюда.',
  'Go': 'Отправиться',
  'Passage': 'Переход',
  'You step through the arch…': 'Вы проходите сквозь арку…',
  'The aurora only shows at night': 'Сияние бывает только ночью',
  'You already know every creature': 'Вы уже знаете всех существ',
  'VISION': 'ВИДЕНИЕ',
  'Wonders found': 'Чудес найдено',
  'drag them to look from every side.': 'потяните, чтобы осмотреть со всех сторон.',
  'find it in ': 'ищите в зоне ',
  'Wonders of the world': 'Чудеса света',

  /* ---- mappa ---- */
  'explored ': 'исследовано ',
  'wonders ': 'чудеса ',
  'WORLD MAP': 'КАРТА МИРА',
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
  'Sign in and find the same game on your phone and computer. Your save is copied to digsy.dev-box.it.': 'Войди — и та же игра будет на телефоне и на компьютере. Сохранение копируется на digsy.dev-box.it.',
  'This device and the server have two different games. Which one do you keep?': 'На этом устройстве и на сервере две разные игры. Какую оставить?',
  'this one': 'эту',
  'the saved one': 'сохранённую',
  'Sign out': 'Выйти из аккаунта',
  'Delete account and games': 'Удалить аккаунт и игры',
  'Delete your account and the games saved on the server? The game on this device stays.': 'Удалить аккаунт и игры, сохранённые на сервере? Игра на этом устройстве останется.',
  'Google is unreachable. Try again later.': 'Google недоступен. Попробуй позже.',
  'Sign-in failed': 'Не удалось войти',
  'Sign-in unavailable': 'Вход недоступен',
  'Done': 'Готово',
  'Exit': 'Выход',
  'CHEAT · NO SAVE': 'ЧИТ · БЕЗ СОХРАНЕНИЯ',
  'Update the game': 'Обновить игру',
  'museum': 'музей',
  ' map': ' карта',
  /* intro: dove si porta il primo fossile */
  'It is raw, though. You still do not know which creature it is.': 'Но он необработанный. Ты ещё не знаешь, чьи это кости.',
  'Take it to the Museum: the experts there will identify it.': 'Отнеси его в Музей: тамошние знатоки его определят.',
  'Every big city has a Museum. Hamlets and towns do not.': 'Музей есть в каждом большом городе. В деревушках и посёлках — нет.',
  'And how do I find a big city?': 'А как найти большой город?',
  'The map marks it for you: look for the pale little temple.': 'Карта его отметит: ищи светлый храмик.',
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
  'You can find it again in the Guide (bag → ❔)': 'Это всегда можно перечитать в Справке (рюкзак → ❔)',
  'Tip': 'Подсказка',
  'Everything you need to know. The greyed out ones you will meet as you play.':
    'Всё, что нужно знать. Затемнённые пункты откроются по ходу игры.',
  'Controls: left stick to move · <kbd>A</kbd> to act · bag at the top · menu ☰':
    'Управление: левый джойстик — движение · <kbd>A</kbd> — действие · рюкзак сверху · меню ☰',
  'Guide': 'Справка',
  'No active missions. Find the town board 📋!': 'Активных заданий нет. Найдите городскую доску 📋!',
  'ready': 'готово',

  /* ---- compagno ---- */
  'No chimera or awakened fossil yet. Assemble a chimera or awaken a species at the Lab!':
    'Пока нет ни химеры, ни пробуждённого вида. Соберите химеру или пробудите вид в Лаборатории!',
  'No companion': 'Без спутника',
  'Send home': 'Отправить домой',
  'with you': 'с вами',
  'Choose': 'Выбрать',
  'Companion': 'Спутник',
  'Companion sent home': 'Спутник отправлен домой',
  ' is with you!': ' теперь с вами!',

  /* ---- guida HUD ---- */
  'What the top bar means:': 'Что означает верхняя панель:',
  'Coins': 'Монеты',
  'Used to buy tools, maps and cosmetics.': 'Нужны для инструментов, карт и внешнего вида.',
  'Each dig costs 1. Sleep at the Inn to refill.': 'Каждая раскопка стоит 1. Отдых в Таверне восполняет.',
  'Time passes as you play; dawn is at 06:00.': 'Время идёт во время игры; рассвет в 06:00.',
  'Season': 'Сезон',
  'Changes every 3 days and recolors the world.': 'Меняется каждые 3 дня и перекрашивает мир.',
  'Zone': 'Зона',
  'Weather': 'Погода',
  'Clear': 'Ясно',
  'Changes daily; rain makes digging more rewarding.': 'Меняется каждый день; в дождь раскопки щедрее.',
  'Archaeologist level': 'Уровень археолога',
  'Rises by finding fossils and finishing missions: more max energy, faster digging, more rares.':
    'Растёт за находки и выполненные задания: больше энергии, быстрее раскопки, больше редкостей.',
  "Take them at the town board 📋 (press Q to review). They expire at day's end.":
    'Берите их на городской доске 📋 (Q — посмотреть). Сгорают в конце дня.',
  'none': 'нет',
  'Choose one at the park in big cities.': 'Выберите в парке большого города.',
  'Move with WASD/arrows · <b>E</b> collect/dig/enter · <b>I</b> bag · <b>L</b> book · <b>Q</b> missions':
    'Движение WASD/стрелки · <b>E</b> подобрать/копать/войти · <b>I</b> рюкзак · <b>L</b> книга · <b>Q</b> задания',
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
  'XP from digging (rarer = more XP) and missions.':
    'Опыт за находки (чем реже — тем больше) и за задания.',
  'Master Digger': 'Мастер раскопок',

  /* ---- laboratorio ---- */
  'The laboratory awakens: chimeras and complete species. (Raw finds are identified at the <b>Museum</b>.)':
    'Лаборатория оживляет: химеры и целые виды. (Необработанные находки определяют в <b>Музее</b>.)',
  'Awaken a chimera': 'Оживить химеру',
  'Assemble an identified <b>Skull + Ribcage + Leg</b>': 'Соберите определённые <b>Череп + Грудная клетка + Лапа</b>',
  '1 vial per species used': '1 пробирка на каждый использованный вид',
  'the creature comes alive in the big-city <b>park</b>. Chimeras created':
    'существо оживает в <b>парке</b> большого города. Химер создано',
  'Missing': 'Не хватает',
  'Awaken!': 'Оживить!',
  'Preview of the assembled creature': 'Предпросмотр собранного существа',
  'Awaken a species': 'Пробудить вид',
  'DEBUG: infinite DNA vials. Awakened': 'ОТЛАДКА: бесконечные пробирки ДНК. Пробуждено',
  'Discover some fossils to awaken them.': 'Найдите ископаемых, чтобы их пробудить.',
  'No DNA vials in your bag.': 'В рюкзаке нет пробирок ДНК.',
  'DNA vial ready': 'Пробирка ДНК готова',
  'Awaken': 'Пробудить',
  'Debug': 'Отладка',
  'Spawn all fossils': 'Выдать все ископаемые',
  'Every piece of all 60 species, identified': 'Все части всех 60 видов, определённые',
  'Spawn': 'Выдать',
  'Fossil Book': 'Книга ископаемых',
  'Fossils reconstructed': 'Восстановлено ископаемых',
  'Open (L)': 'Открыть (L)',
  'All fossils in your bag!': 'Все ископаемые в рюкзаке!',

  /* ---- negozio ---- */
  'The shop buys <b>identified</b> finds. Raw ones must go to the Laboratory first.':
    'Магазин покупает <b>определённые</b> находки. Необработанные сначала в Лабораторию.',
  'No identified finds to sell.': 'Нет определённых находок на продажу.',
  'Total sellable': 'Всего к продаже',
  'Sell all': 'Продать всё',
  'Sell': 'Продать',
  'Collected objects': 'Собранные предметы',
  'Total': 'Всего',
  'Left today: ': 'Осталось сегодня: ',
  ' · the price rises with each one': ' · цена растёт с каждым',
  'Sold out for today: the baker bakes more tomorrow': 'На сегодня всё: пекарь испечёт ещё завтра',
  'Sold out': 'Распродано',
  'Snack': 'Перекус',
  'Return scroll': 'Свиток возврата',
  'From your bag: teleport to the nearest city': 'Из рюкзака: перенос в ближайший город',
  'Bigger bag': 'Рюкзак побольше',
  'Fossil capacity': 'Вместимость для находок',
  'maxed': 'максимум',
  'Treasure maps': 'Карты сокровищ',
  'A distant X, a guaranteed find. Rarer = farther.': 'Далёкий крестик и гарантированная находка. Реже — дальше.',
  'steps': 'шагов',
  'Tools': 'Инструменты',
  'Spade': 'Лопата',
  'Essential to dig the ground': 'Без неё землю не копать',
  'Lucky shovel': 'Счастливая лопатка',
  '60 digs with boosted drops': '60 раскопок с повышенной добычей',
  'charges': 'зарядов',
  'Hatchet': 'Топор',
  'Chop trees: some fossils live there': 'Рубите деревья: там водятся некоторые ископаемые',
  'Pickaxe': 'Кирка',
  'Break boulders and spires: rock fossils': 'Разбивайте валуны и шпили: каменные ископаемые',
  'Boat': 'Лодка',
  'Sail anywhere and FISH aquatic fossils': 'Плывите куда угодно и ЛОВИТЕ водных ископаемых',
  'Vehicles & light': 'Транспорт и свет',
  'Skates': 'Коньки',
  'Speed ×2 on foot': 'Скорость ×2 пешком',
  'Bicycle': 'Велосипед',
  'Speed ×3 on foot': 'Скорость ×3 пешком',
  'Motorboat': 'Моторная лодка',
  'Speed ×3 on water (needs the boat)': 'Скорость ×3 по воде (нужна лодка)',
  'Torch': 'Факел',
  'Wider light halo at night and in caves': 'Шире круг света ночью и в пещерах',
  'Compass': 'Компас',
  'Points to the nearest town (toggle from the bag)': 'Указывает на ближайший город (включается из рюкзака)',
  'Sold ': 'Продано ',
  ' finds for 🪙': ' находок за 🪙',
  ' objects for 🪙': ' предметов за 🪙',

  /* ---- museo ---- */
  '📖 New pages in the book: ': '📖 Новые страницы в книге: ',
  'Discovered': 'Открыто',
  'Hand in all': 'Сдать всё',
  'up to ×1.5': 'до ×1,5',
  'Skip': 'Пропустить',
  'Restore': 'Реставрировать',
  'Being examined': 'На исследовании',
  'Come back tomorrow (day ': 'Возвращайтесь завтра (день ',
  'Ready!': 'Готово!',
  'finds identified': 'находок определено',
  'Collect': 'Забрать',
  'Complete species': 'Полных видов',
  'Book': 'Книга',
  'DNA refills': 'Пополнение ДНК',
  'Handed in! Come back tomorrow to collect': 'Сдано! Возвращайтесь завтра за результатом',
  'Case complete! DNA vial of ': 'Витрина собрана! Пробирка ДНК: ',
  'Returned to you': 'Возвращено вам',
  'No duplicates: everything on display!': 'Дубликатов нет: всё пошло в экспозицию!',
  'New pieces displayed': 'Новых частей в экспозиции',
  'Needs <b>identified</b> pieces: hand raw finds to the desk first.':
    'Нужны <b>определённые</b> части: сначала сдайте необработанные находки на стойку.',
  'You get': 'У вас есть',
  'days': 'дн.',
  'One at a time. If it expires you lose nothing: the Curator offers another.':
    'Только один за раз. Если просрочите, вы ничего не теряете: Хранитель предложит новый.',
  'Commission accepted': 'Заказ принят',
  'Commission complete!': 'Заказ выполнен!',
  'Pieces on display': 'Частей в экспозиции',
  "Case complete: DNA available at the Curator's desk": 'Витрина собрана: ДНК можно взять у стойки Хранителя',
  'Sleep until night 🌙': 'Спать до ночи 🌙',

  /* ---- zaino ---- */
  'Bag': 'Рюкзак',
  'Finds': 'Находки',
  'Raw finds for the Museum': 'Необработанные находки для Музея',
  'Raw': 'Необработанное',
  'to Museum': 'в Музей',
  'coins': 'монет',
  'Empty: go dig!': 'Пусто: идите копать!',
  'not bought yet · Shop': 'ещё не куплено · Магазин',
  'E to dig the ground': 'E — копать землю',
  'E facing a tree': 'E перед деревом',
  'boulders, spires and cave crystals': 'валуны, шпили и пещерные кристаллы',
  'wider light halo': 'шире круг света',
  'points to town': 'указывает на город',
  'off': 'выкл',
  'On': 'Вкл',
  'boosted digs': 'удачных раскопок',
  'in use': 'используется',
  'spare': 'в запасе',
  'speed ×2 on foot': 'скорость ×2 пешком',
  'speed ×3 on foot': 'скорость ×3 пешком',
  'you board it automatically · E to fish': 'садитесь автоматически · E — рыбалка',
  'replaces the boat, ×3 on water': 'заменяет лодку, ×3 по воде',
  'to the nearest city': 'в ближайший город',
  'sell at the Shop': 'продать в Магазине',
  'Stop': 'Стоп',
  'Track': 'Следить',
  'Vehicles': 'Транспорт',
  'Other': 'Прочее',
  'DNA': 'ДНК',
  'Infinite DNA: free awakenings and chimeras at the Lab':
    'Бесконечная ДНК: пробуждения и химеры в Лаборатории бесплатно',
  'At the museum': 'В музее',
  'pickup from day ': 'забрать с дня ',
  'Chimeras': 'Химеры',
  'No DNA or chimeras yet': 'Пока нет ни ДНК, ни химер',
  'Fill a Museum room (one piece of every species of that zone) and the Curator hands you the letter your grandparent left.':
    'Заполните зал Музея (по одной части каждого вида этой зоны), и Хранитель отдаст письмо, оставленное вашим дедом.',
  'Objects': 'Предметы',
  'Letters': 'Письма',
  'Compass tracking the X': 'Компас следит за крестиком',
  'Compass back to town': 'Компас снова на город',
  'Leave it on the ground?': 'Оставить на земле?',
  'it stays on the ground: pick it up with E': 'останется на земле: подобрать можно на E',
  'Cancel': 'Отмена',
  'Drop it': 'Бросить',

  /* ---- barbiere e sartoria ---- */
  'Unlocked! ': 'Открыто! ',
  'Applied for 🪙 ': 'Применено за 🪙 ',
  'Done!': 'Готово!',
  'unlock': 'открыть',
  'Try freely: free until you confirm': 'Примеряйте сколько угодно: до подтверждения бесплатно',
  'Confirm': 'Подтвердить',
  'Try any haircut you like: pay 🪙 ': 'Примеряйте любую стрижку: платите 🪙 ',
  'per change only on confirm. ✨ themed cuts unlock on payment. (Preview without hat)':
    'за изменение только при подтверждении. ✨ тематические стрижки открываются при оплате. (Предпросмотр без шляпы)',
  'Haircut': 'Стрижка',
  'Color': 'Цвет',
  'Try anything you like: pay 🪙 ': 'Примеряйте что угодно: платите 🪙 ',
  'per item only on confirm. ✨ special hats unlock on payment. Removing the hat (✕) is free.':
    'за предмет только при подтверждении. ✨ особые шляпы открываются при оплате. Снять шляпу (✕) бесплатно.',

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
  'Shaved': 'Налысо', 'Short': 'Короткие', 'Long': 'Длинные', 'Curly': 'Кудрявые',
  'Punk': 'Панк', 'Balding': 'С залысинами', 'Sprouts': 'Ростки', 'Dune': 'Дюна',
  'Woodland': 'Лесная', 'Ember': 'Пламя', 'Algae': 'Водоросли', 'Frost': 'Иней',
  'Explorer': 'Исследователь', 'Cap': 'Кепка', 'Beanie': 'Шапочка', 'Viking': 'Викинг',
  'Cowboy': 'Ковбой', 'Sombrero': 'Сомбреро', 'Party': 'Праздник', 'Santa': 'Дед Мороз',
  'Flower crown': 'Венок', 'Bandana': 'Бандана', 'Hood': 'Капюшон', 'Snorkel': 'Трубка',
  'Ushanka': 'Ушанка',

  /* ---- ultime voci (stringhe scritte con gli apici doppi nel codice) ---- */
  'drifting in mid-air': 'парящее в воздухе',
  "All of Grandpa's letters unlocked (": 'Все письма дедушки открыты (',
  "Grandpa's gift: a legendary fossil to identify at the museum!":
    'Подарок дедушки: легендарное ископаемое — определите его в музее!',
  "I've got one in my bag already: coming!": 'У меня уже есть одно в рюкзаке — иду!',
  "Thank you! I'll fill them all.": 'Спасибо! Я заполню их все.',
  "What's new": 'Что нового',
  'Choose who follows you in the world. Each companion has an ability that helps you.':
    'Выберите, кто пойдёт с вами. У каждого спутника своя полезная способность.',
  'Sleep until dawn 🌙': 'Спать до рассвета 🌙',
  "Today's requests from the townsfolk. You can hold ": 'Сегодняшние заказы горожан. Можно взять ',
  " at a time; they expire at day's end.": ' одновременно; они сгорают в конце дня.',
  "Grandpa's letters": 'Письма дедушки',
  "from Grandpa's notebook": 'из тетради дедушки',
  "Active missions (expire at day's end). Deliver at the town board.":
    'Активные задания (сгорают в конце дня). Сдавать на городской доске.',
  "It's night: sleeping wakes you at dawn of the next day.":
    'Сейчас ночь: после сна вы проснётесь на рассвете следующего дня.',
  "It's daytime: sleeping wakes you deep at night.":
    'Сейчас день: после сна вы проснётесь глубокой ночью.',
  "Can't sleep again yet: spend at least half a day awake first.":
    'Пока спать нельзя: сначала проведите хотя бы полдня на ногах.',

  /* ---- suggerimenti con segnaposto ({act} = tasto azione, {key:M} = scorciatoia) ---- */
  'Press {act} to dig the tile under your feet. Each dig costs 1 ⚡ and every tile runs out: walk a bit and try again.':
    'Нажмите {act}, чтобы копать клетку под ногами. Каждая раскопка стоит 1 ⚡, и каждая клетка исчерпывается: пройдите немного и попробуйте снова.',
  'Your bag has a limit: extra finds stay <b>on the ground</b> and can be picked up with {act}. The Shop sells bigger bags.':
    'У рюкзака есть предел: лишние находки остаются <b>на земле</b>, поднять их можно на {act}. В Магазине продаются рюкзаки побольше.',
  'You need a <b>boat</b> (Shop) to sail: once bought you board it automatically by stepping into the water. Press {act} on water to fish.':
    'Чтобы плыть, нужна <b>лодка</b> (Магазин): после покупки вы садитесь в неё сами, заходя в воду. На воде нажмите {act}, чтобы рыбачить.',
  'The map{key:M} is revealed by walking. Zoom with the wheel or two fingers, drag it around, and tap a pin to see what it is.':
    'Карта{key:M} открывается по мере ходьбы. Масштаб — колесом или двумя пальцами, карту можно двигать, а по метке — нажать, чтобы узнать, что это.',

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
  'The Great Ribcage': 'Великая грудная клетка',
  'The ribcage of an immense creature, half buried in the sand.':
    'Грудная клетка огромного существа, наполовину занесённая песком.',
  'Under the ribs the sand is untouched: the finds there are always good.':
    'Под рёбрами песок нетронут: находки там всегда хорошие.',
  'Sheltered dig: 3 fine finds.': 'Раскопки в укрытии: 3 отличные находки.',
  'The Fairy Ring': 'Ведьмин круг',
  'A perfect ring of mushrooms that glow green at night.':
    'Идеальный круг грибов, светящихся ночью зелёным.',
  'Spores on your spade bring luck. Do not ask me why.':
    'Споры на лопате приносят удачу. Не спрашивай почему.',
  'Lucky spores: doubled finds for 10 digs.': 'Счастливые споры: удвоенная добыча на 10 раскопок.',
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
  'A whole creature, intact, suspended inside the blue ice.':
    'Целое существо, нетронутое, застывшее в голубом льду.',
  'I never managed to free it. You do it, one piece at a time.':
    'Мне так и не удалось его освободить. Сделай это ты, по кусочку.',
  'Free it: one piece of the same species each time.': 'Освобождение: по одной части того же вида за раз.',
  'The Aurora': 'Северное сияние',
  'Ribbons of green light waving above the snow.': 'Ленты зелёного света колышутся над снегом.',
  'Under the aurora I understood which creature to seek next. Look up.':
    'Под сиянием я понял, какое существо искать дальше. Подними глаза.',
  'Vision: reveals an unseen species in the Book (at night only).':
    'Видение: открывает в Книге неизвестный вид (только ночью).',

  /* ---- TRAGUARDI ---- */
  'First discovery': 'Первая находка',
  'Dig or collect your first find': 'Выкопайте или подберите первую находку',
  'Naturalist': 'Натуралист',
  'Discover 10 species': 'Откройте 10 видов',
  'Expert': 'Знаток',
  'Discover 30 species': 'Откройте 30 видов',
  'Encyclopedic': 'Энциклопедист',
  'Discover all {n} species': 'Откройте все {n} видов',
  'Creator': 'Творец',
  'Assemble your first chimera': 'Соберите первую химеру',
  'Reviver': 'Воскреситель',
  'Spelunker': 'Спелеолог',
  'Explore a cave': 'Исследуйте пещеру',
  'Patron': 'Меценат',
  'Complete a museum case': 'Соберите витрину в музее',
  'Wealthy': 'Богач',
  'Reach 500 coins': 'Накопите 500 монет',
  'Seasoned archaeologist': 'Опытный археолог',
  'Reach level 5': 'Достигните 5-го уровня',
  'Fixer': 'Мастер на все руки',
  'Complete 5 missions': 'Выполните 5 заданий',
  'Loyal friend': 'Верный друг',
  'Choose a companion at the park': 'Выберите спутника в парке',

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
  'One more thing: keep your eyes down. Mushrooms, wheat ears, shells…':
    'И ещё одно: смотри под ноги. Грибы, колосья, ракушки…',
  'Things glinting on the ground. Pick them up and sell them at the Shop:':
    'Всё, что поблёскивает на земле. Собирай это и продавай в Магазине:',
  'that is how you pay for your first tools. The spade before anything else.':
    'так ты и заработаешь на первые инструменты. Прежде всего — на лопату.',

  /* ---- zaino: lasciare a terra (bottone, non trascinamento) ---- */
  'Tap 🗑 on a find to leave it on the ground (you can pick it back up).':
    'Нажмите 🗑 на находке, чтобы оставить её на земле (потом можно поднять).',
  'Leave on the ground': 'Оставить на земле',
  'Leave': 'Выйти',
  'Too far, or no way through from here': 'Слишком далеко или дороги отсюда нет',

  /* ---- fusione dei doppioni ---- */
  'Fuse duplicates': 'Сплавить дубликаты',
  '<b>3 identical pieces</b> become <b>1 piece of the next rarity</b>, same part, from a species of the same zone. No coins needed: the three pieces are the price.':
    '<b>3 одинаковые части</b> превращаются в <b>1 часть следующей редкости</b>: та же часть, вид из той же зоны. Монеты не нужны — платой служат сами три части.',
  'No group of 3 identical pieces yet.': 'Пока нет ни одной тройки одинаковых частей.',
  'not yet on display at the Museum': 'ещё не выставлено в Музее',
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
  'opens the console: type a command and hit enter. They are for testing: they turn on cheats and saving stays frozen until you type <b>vanilla</b>.':
    'открывает консоль: введите команду и нажмите ввод. Они нужны для тестов: включают читы, и сохранение остаётся замороженным, пока вы не введёте <b>vanilla</b>.',

  /* ---- DNA: 2 fialette risvegliano, 1 basta per una chimera ---- */
  'Complete a Museum case (5 pieces of one species) to get a <b>DNA vial</b>. The Laboratory needs <b>2</b> to awaken the species, <b>1</b> to use it in a chimera.':
    'Соберите витрину Музея (5 частей одного вида) и получите <b>пробирку ДНК</b>. Лаборатории нужно <b>2</b>, чтобы пробудить вид, и <b>1</b>, чтобы использовать его в химере.',
  'You need <b>2 DNA vials</b> of the same species (a complete case 5/5 gives one; more can be bought at the Museum): we inject them here and the species comes back <b>ALIVE</b> in the Book. Awakened':
    'Нужны <b>2 пробирки ДНК</b> одного вида (полная витрина 5/5 даёт одну, остальные покупаются в Музее): здесь их вводят, и вид оживает <b>ЖИВЫМ</b> в Книге. Пробуждено',
  'vials · at the Lab: 2 awaken the species, 1 is enough for a chimera':
    'пробирки · в Лаборатории: 2 пробуждают вид, 1 хватает на химеру',
  'This is where you build chimeras: bring me an identified skull, torso and leg (+ some coins) and I assemble them — one DNA vial per species used. With TWO vials of the same species I can instead bring it back whole.':
    'Здесь собирают химер: принесите определённые череп, грудную клетку и лапу (плюс немного монет), и я их соберу — по одной пробирке ДНК на каждый использованный вид. А с ДВУМЯ пробирками одного вида я верну его целиком.',
  'Bring me your RAW finds and I identify them right away. New pieces stay on display; complete a case (5 of 5) and you earn a DNA vial — the Laboratory needs two of them to bring a species back.':
    'Несите мне НЕОБРАБОТАННЫЕ находки — определю сразу. Новые части останутся в экспозиции; соберите витрину (5 из 5) и получите пробирку ДНК — Лаборатории нужны две, чтобы вернуть вид к жизни.',

  /* ---- abilità del compagno ---- */
  '🐾 Sniff: points to nearby ground finds': '🐾 Нюх: показывает находки на земле поблизости',
  '🧭 Compass: always shows town distance and name': '🧭 Компас: всегда показывает расстояние и название города',
  '✨ Luck: better digs and pricier objects': '✨ Удача: лучше раскопки и дороже предметы',

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
  'I change your haircut and hair color. Try as much as you like for free: you only pay on confirm. Each region hides an exclusive style.':
    'Здесь меняют стрижку и цвет волос. Примеряйте сколько угодно бесплатно: платите только при подтверждении. В каждой зоне спрятан свой особый стиль.',
  'Here you pick shirt, trousers and hat. Try freely and pay on confirm; some special hats are unlocked separately.':
    'Здесь выбирают рубашку, штаны и шляпу. Примеряйте свободно, платите при подтверждении; некоторые особые шляпы открываются отдельно.',

  /* ---- intro: le prime battute ---- */
  'Come, {n}. Look what the earth hides.': 'Иди сюда, {n}. Посмотри, что прячет земля.',
  'Grandpa… what is that?': 'Дедушка… а это что?',
  'A bone. From a creature of long, long ago.': 'Кость. Существа, жившего очень-очень давно.',
  'I was the first to find them. No one remembered them.': 'Я первым их нашёл. О них никто не помнил.',
  'And can we… bring them back?': 'А мы можем… вернуть их?',
  'With patience and a spark of magic… yes.': 'С терпением и капелькой волшебства… да.',
  'Take it, {n}: a legendary fossil, your first treasure.': 'Держи, {n}: легендарное ископаемое, твоё первое сокровище.',
  "I promise! I'll find them all and bring them back!": 'Обещаю! Я найду их всех и верну к жизни!',

  /* ---- comandi: col mouse si gioca senza tastiera ---- */
  'Keys: <kbd>WASD</kbd> move · <kbd>E</kbd> act · <kbd>I</kbd> bag · <kbd>L</kbd> book · <kbd>M</kbd> map · <kbd>Q</kbd> missions · <kbd>ESC</kbd> menu<br>With the mouse: <b>click</b> to walk, <b>right click</b> to act.':
    'Клавиши: <kbd>WASD</kbd> движение · <kbd>E</kbd> действие · <kbd>I</kbd> рюкзак · <kbd>L</kbd> книга · <kbd>M</kbd> карта · <kbd>Q</kbd> задания · <kbd>ESC</kbd> меню<br>Мышью: <b>клик</b> — идти, <b>правая кнопка</b> — действие.',

  /* ---- uscita dagli interni ---- */
  /* ---- partita in cloud e zaino pieno in grotta ---- */
  'Picked up your saved game (': 'Загружена сохранённая игра (',
  "Kept this device's game (": 'Оставлена игра с этого устройства (',
  'Bag full: the crystal stays here, come back for it': 'Рюкзак полон: кристалл останется здесь, вернись за ним',
  'Sign in with Google': 'Войти через Google',
  'This address is not authorised with Google: ': 'Этот адрес не разрешён в Google: ',
  '. That is a setup problem, not something you did.': '. Это ошибка настройки, а не твоя вина.',
  'Google did not confirm the sign-in. Try again.': 'Google не подтвердил вход. Попробуй ещё раз.',
  'No connection: your game stays saved on this device.': 'Нет сети: игра сохраняется на этом устройстве.',
  'What happens to your data': 'Что происходит с твоими данными',
  'These games are on the server too: you will find them on every device.': 'Эти сохранения есть и на сервере: ты найдёшь их на любом устройстве.',
  'These games stay on this device. Sign in with Google to find them anywhere.': 'Эти сохранения остаются на этом устройстве. Войди через Google, чтобы найти их везде.',
  'You signed in on another device: here the game stays saved locally.': 'Ты вошёл на другом устройстве: здесь игра сохраняется локально.',
  /* ---- statistiche, conferme, museo ---- */
  'Bag full: ': 'Рюкзак полон: ',
  ' pieces stay at the Museum, come back for them': ' предметов останутся в Музее, вернись за ними',
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
  'Downloads the game again. Your save stays where it is.': 'Игра скачается заново. Сохранение останется на месте.',
  'The stick appears where you put your finger.': 'Джойстик появляется там, где ты касаешься.',
  'Tap a spot and Digsy walks there.': 'Коснись точки — и Дигси туда пойдёт.',
  'The stick stays in the same corner.': 'Джойстик всегда в одном углу.',
  'Hold the button and Digsy walks towards the pointer.': 'Удерживай кнопку — Дигси пойдёт к указателю.',
  'You move with WASD or the arrow keys.': 'Движение на WASD или стрелках.',
  'Click a spot and Digsy walks there.': 'Кликни по точке — и Дигси туда пойдёт.',
  'The right mouse button does what <kbd>E</kbd> does.': 'Правая кнопка мыши делает то же, что <kbd>E</kbd>.',
  'The boxes explaining a mechanic the first time. They stay in the Guide (bag → ❔).': 'Подсказки при первой встрече с механикой. Остаются в Справке (рюкзак → ❔).',
  'Right': 'Правая',
  'Left': 'Левая',
  /* ---- installazione come app ---- */
  'Install Digsy': 'Установить Digsy',
  'Install now': 'Установить сейчас',
  'With the icon on your home screen the game opens full-screen and works <b>even offline</b>: the world and your save live on your device.': 'С иконкой на экране игра открывается на весь экран и работает <b>даже без сети</b>: мир и сохранение живут на твоём устройстве.',
  'tap <b>Share</b> at the bottom': 'нажми <b>Поделиться</b> внизу',
  'scroll and tap <b>Add to Home Screen</b>': 'прокрути и нажми <b>На экран «Домой»</b>',
  'confirm with <b>Add</b>': 'подтверди кнопкой <b>Добавить</b>',
  'On iPhone you need Safari.': 'На iPhone нужен Safari.',
  'It is an Apple rule: other browsers cannot install. Open <b>digsy.dev-box.it</b> in Safari and come back here.': 'Это правило Apple: другие браузеры не умеют устанавливать. Открой <b>digsy.dev-box.it</b> в Safari и вернись сюда.',
  'Then, in Safari:': 'Затем, в Safari:',
  'Install on device': 'Установить на устройство',
  'Done': 'Готово',
  'How': 'Как',
  'The game is already installed on this device.': 'Игра уже установлена на этом устройстве.',
  'Look for <b>Install</b> or <b>Add to Home screen</b> in your browser menu (the three dots at the top).': 'Найди <b>Установить</b> или <b>Добавить на главный экран</b> в меню браузера (три точки вверху).',
  'Anonymous stats': 'Анонимная статистика',
  'Send how it is going': 'Отправлять, как идут дела',
  'How long you played and how far you got, to see where the game drags. <b>Nothing</b> that says who you are: no name, no email, no address.': 'Сколько ты играл и как далеко продвинулся — чтобы понять, где игра скучна. <b>Ничего</b>, что говорит, кто ты: ни имени, ни почты, ни адреса.',
};
