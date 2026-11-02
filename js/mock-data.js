// SYNTHETIC DEMO DATA. Every person, phone number and report below is invented.
// Dates are generated relative to today so the demo always looks current.
(function () {
  const T = window.MarthaTime;

  const CATALOG = [
    { key: 'intro', title: 'Intro', order: 1, minutes: 45, auto: true },
    { key: 'seeking_god', title: 'Seeking God', order: 2, minutes: 60, auto: true },
    { key: 'word_of_god', title: 'Word of God', order: 3, minutes: 90, auto: true },
    { key: 'discipleship', title: 'Discipleship', order: 4, minutes: 90, auto: true },
    { key: 'truth', title: 'Truth', order: 5, minutes: 60, auto: false },
    { key: 'kingdom', title: 'Kingdom', order: 6, minutes: 90, auto: true },
    { key: 'persecution', title: 'Persecution', order: 7, minutes: 90, auto: true },
    { key: 'light_and_darkness', title: 'Light & Darkness', order: 8, minutes: 90, auto: true },
    { key: 'new_covenant_conversion', title: 'New Covenant Conversion', short: 'New Covenant', order: 9, minutes: 90, auto: false },
    { key: 'cross', title: 'Cross', order: 10, minutes: 120, auto: true },
    { key: 'church', title: 'Church', order: 11, minutes: 120, auto: true },
    { key: 'count_the_cost', title: 'Count the Cost', order: 12, minutes: 120, auto: true },
  ];

  const CHAPTERS = [
    { id: 'ucr', slug: 'ucr', name: 'UCR', timezone: 'America/Los_Angeles', bibleTalksEnabled: true },
    { id: 'cbu', slug: 'cbu', name: 'CBU', timezone: 'America/Los_Angeles', bibleTalksEnabled: false },
  ];

  const TALKS = [
    { id: 'bt-relentless', chapter: 'ucr', name: 'Relentless', leaderId: 'd1', coLeaderId: null, tone: 'rose' },
    { id: 'bt-harvest', chapter: 'ucr', name: 'Harvest', leaderId: 'd3', coLeaderId: 'd8', tone: 'green' },
  ];

  // [id, first, last, gender, chapter, talk, role, phoneSuffix, birthday M-D, spirthday Y-M-D, aliases]
  const DISCIPLES = [
    ['d1', 'Caleb', 'Henry', 'men', 'ucr', 'bt-relentless', 'coordinator', '00', '3-14', '2019-10-6', []],
    ['d2', 'Marcus', 'Bell', 'men', 'ucr', 'bt-relentless', 'member', '01', '11-9', '2022-4-17', ['Marc']],
    ['d3', 'Jonah', 'Park', 'men', 'ucr', 'bt-harvest', 'leader', '02', '7-2', '2020-2-23', []],
    ['d4', 'Elijah', 'Turner', 'men', 'ucr', 'bt-harvest', 'member', '03', '11-21', '2023-5-7', ['Eli']],
    ['d5', 'Andre', 'Silva', 'men', 'ucr', 'bt-relentless', 'member', '04', '1-30', '2024-1-14', ['Dre']],
    ['d6', 'Isaiah', 'Grant', 'men', 'ucr', 'bt-harvest', 'member', '05', '9-12', '2025-3-2', []],
    ['d7', 'Grace', 'Kim', 'women', 'ucr', 'bt-relentless', 'leader', '06', '5-5', '2021-9-19', ['Gracie']],
    ['d8', 'Hannah', 'Lopez', 'women', 'ucr', 'bt-harvest', 'leader', '07', '11-28', '2020-11-15', []],
    ['d9', 'Priya', 'Nair', 'women', 'ucr', 'bt-relentless', 'member', '08', '8-24', '2023-11-12', []],
    ['d10', 'Naomi', 'Adeyemi', 'women', 'ucr', 'bt-harvest', 'member', '09', '12-3', '2024-4-28', []],
    ['d11', 'Sofia', 'Ramirez', 'women', 'ucr', 'bt-relentless', 'member', '10', '2-11', '2022-10-30', ['Sofi']],
    ['d12', 'Leah', 'Chen', 'women', 'ucr', 'bt-harvest', 'member', '11', '6-18', '2025-2-9', []],
    ['d13', 'Tyler', 'Brooks', 'men', 'cbu', null, 'admin', '12', '10-4', '2021-6-6', []],
    ['d14', 'Ruth', 'Okoye', 'women', 'cbu', null, 'member', '13', '11-14', '2023-8-20', []],
  ];

  // Journey steps: [studyKey, part, dayOffset, hour, minute, state, leader, organizer, report]
  // state: c = completed, p = got partway, n = happened (no report yet), s = scheduled, i = imported/unverified
  const STUDENTS = [
    ['s1', 'Ethan', 'Morales', 'men', 'ucr', '20', [
      ['intro', 1, -34, 19, 0, 'c', 'd2', 'd2', 1], ['seeking_god', 1, -28, 18, 30, 'p', 'd2', 'd2', 2],
      ['seeking_god', 2, -24, 19, 0, 'c', 'd1', 'd2', 3], ['word_of_god', 1, -17, 17, 0, 'c', 'd1', 'd2', 4],
      ['discipleship', 1, -9, 19, 30, 'c', 'd2', 'd2', 5], ['kingdom', 1, 2, 19, 0, 's', 'd1', 'd2']]],
    ['s2', 'Ava', 'Thompson', 'women', 'ucr', '21', [
      ['intro', 1, -20, 12, 0, 'c', 'd7', 'd9', 1], ['seeking_god', 1, -13, 12, 30, 'c', 'd7', 'd9', 6],
      ['word_of_god', 1, -6, 15, 0, 'c', 'd9', 'd9', 4], ['discipleship', 1, 1, 15, 0, 's', 'd7', 'd9']]],
    ['s3', 'Noah', 'Bennett', 'men', 'ucr', '22', [
      ['intro', 1, -23, 16, 0, 'c', 'd4', 'd6', 7]]],
    ['s4', 'Mia', 'Patel', 'women', 'ucr', '23', [
      ['intro', 1, -88, 11, 0, 'c', 'd8', 'd10', 1], ['seeking_god', 1, -81, 11, 0, 'c', 'd8', 'd10', 6],
      ['word_of_god', 1, -74, 14, 0, 'c', 'd10', 'd10', 4], ['discipleship', 1, -66, 14, 0, 'c', 'd8', 'd10', 5],
      ['truth', 1, -60, 18, 0, 'c', 'd12', 'd10', 8], ['kingdom', 1, -52, 18, 0, 'c', 'd8', 'd10', 9],
      ['persecution', 1, -45, 18, 0, 'c', 'd8', 'd12', 10], ['light_and_darkness', 1, -38, 18, 0, 'p', 'd10', 'd12', 2],
      ['light_and_darkness', 2, -35, 18, 0, 'c', 'd10', 'd12', 3], ['new_covenant_conversion', 1, -27, 17, 0, 'c', 'd8', 'd10', 11],
      ['cross', 1, -18, 18, 30, 'c', 'd8', 'd10', 12], ['church', 1, -10, 18, 30, 'c', 'd7', 'd10', 13],
      ['count_the_cost', 1, 3, 18, 30, 's', 'd8', 'd10']]],
    ['s5', 'Lucas', 'Rivera', 'men', 'ucr', '24', [
      ['intro', 1, -11, 20, 0, 'c', 'd5', 'd5', 1], ['seeking_god', 1, -4, 20, 0, 'p', 'd5', 'd5', 2],
      ['seeking_god', 2, 4, 20, 0, 's', 'd1', 'd5']]],
    ['s6', 'Chloe', 'Wright', 'women', 'ucr', '25', [
      ['intro', 1, 0, 19, 0, 's', 'd11', 'd11']]],
    ['s7', 'Jacob', 'Nguyen', 'men', 'ucr', '26', [
      ['intro', 1, -45, 15, 0, 'c', 'd3', 'd4', 1], ['seeking_god', 1, -38, 15, 0, 'c', 'd3', 'd4', 6],
      ['word_of_god', 1, -29, 15, 0, 'c', 'd4', 'd4', 4], ['discipleship', 1, -18, 15, 0, 'c', 'd3', 'd4', 5]]],
    ['s8', 'Zoe', 'Martinez', 'women', 'ucr', '27', [
      ['intro', 1, -62, 13, 0, 'c', 'd9', 'd7', 1], ['seeking_god', 1, -55, 13, 0, 'c', 'd7', 'd7', 6],
      ['word_of_god', 1, -48, 13, 0, 'c', 'd7', 'd7', 4], ['discipleship', 1, -40, 13, 0, 'c', 'd9', 'd7', 5],
      ['kingdom', 1, -26, 13, 0, 'c', 'd7', 'd7', 9], ['persecution', 1, -19, 13, 0, 'c', 'd7', 'd11', 10],
      ['light_and_darkness', 1, -12, 13, 0, 'c', 'd9', 'd7', 3], ['cross', 1, 5, 13, 0, 's', 'd7', 'd7']]],
    ['s9', 'Daniel', 'Foster', 'men', 'ucr', '28', [
      ['intro', 1, -9, 18, 0, 'c', 'd6', 'd3', 1], ['seeking_god', 1, -1, 18, 0, 'n', 'd3', 'd3']]],
    ['s10', 'Lily', 'Henderson', 'women', 'ucr', '29', [
      ['intro', 1, -140, 14, 0, 'i', 'd8', null], ['seeking_god', 1, -128, 14, 0, 'i', null, null],
      ['word_of_god', 1, -8, 16, 0, 'c', 'd12', 'd8', 4], ['discipleship', 1, 6, 16, 0, 's', 'd12', 'd8']]],
    ['s11', 'Samuel', 'Ortiz', 'men', 'ucr', '30', [
      ['intro', 1, -36, 17, 0, 'c', 'd5', 'd1', 1], ['seeking_god', 1, -29, 17, 0, 'c', 'd1', 'd1', 6],
      ['word_of_god', 1, -22, 17, 0, 'c', 'd5', 'd1', 4], ['discipleship', 1, -14, 17, 0, 'c', 'd1', 'd1', 5],
      ['kingdom', 1, -2, 17, 0, 'c', 'd1', 'd1', 9], ['persecution', 1, 3, 17, 0, 's', 'd5', 'd1']]],
    ['s12', 'Emma', 'Davis', 'women', 'ucr', '31', [
      ['intro', 1, -42, 18, 0, 'c', 'd10', 'd12', 1], ['seeking_god', 1, -35, 18, 0, 'c', 'd10', 'd12', 6],
      ['word_of_god', 1, -28, 18, 0, 'c', 'd12', 'd12', 4], ['discipleship', 1, -21, 18, 0, 'c', 'd10', 'd12', 5],
      ['kingdom', 1, -7, 18, 0, 'c', 'd8', 'd12', 9], ['persecution', 1, 2, 18, 0, 's', 'd8', 'd12']]],
    ['s13', 'Owen', 'Clark', 'men', 'ucr', '32', [
      ['intro', 1, -12, 21, 0, 'c', 'd4', 'd6', 1], ['seeking_god', 1, -5, 21, 0, 'c', 'd6', 'd6', 6],
      ['word_of_god', 1, 1, 20, 0, 's', 'd3', 'd6', null, 'pending_sync']]],
    ['s14', 'Ella', 'Robinson', 'women', 'ucr', '33', [
      ['intro', 1, 4, 12, 30, 's', 'd9', 'd11']]],
    ['s15', 'Ben', 'Carter', 'men', 'cbu', '34', [
      ['intro', 1, -10, 18, 0, 'c', 'd13', 'd13', 1], ['seeking_god', 1, 2, 18, 0, 's', 'd13', 'd13']]],
    ['s16', 'Abby', 'Wells', 'women', 'cbu', '35', [
      ['intro', 1, -3, 13, 0, 'c', 'd14', 'd14', 1]]],
  ];

  const REPORTS = {
    1: (n) => `Met ${n} at the Bell Tower and went through the Intro study. ${n} grew up going to church occasionally but has never read the Bible personally. Very open and asked good questions about why we study one on one. Agreed to read Acts 17 before next time.`,
    2: (n) => `Got about halfway through. ${n} had a lot of questions about prayer, so we slowed down and spent most of the time there. Planning to finish the rest of the study next time.`,
    3: (n) => `Finished the second half today. ${n} was more engaged than last time and had clearly been thinking about it all week. Ready to move on.`,
    4: (n) => `Read through 2 Timothy 3 and Hebrews 4 together. ${n} was struck by the idea that the Bible is meant to be obeyed, not just read. Committed to daily reading in Matthew this week.`,
    5: (n) => `Discipleship study went well. We talked through Matthew 28 and what it means to make disciples. ${n} was honest that it feels like a big commitment. Encouraged to keep studying and to come to church Sunday.`,
    6: (n) => `Seeking God study. ${n} has been reading every morning and shared a verse from Proverbs that stood out. We talked about Acts 17:27 and seeking God with the whole heart.`,
    7: (n) => `Good first study. ${n} is a transfer student and doesn't know many people yet. Invited to Bible Talk on Friday.`,
    8: (n) => `${n} asked to study Truth after a conversation with a roommate. Went through John 8:31-32 and talked about holding to Jesus's teaching.`,
    9: (n) => `Kingdom study. ${n} connected the parables in Matthew 13 to wanting to put God first. Talked about the church as the kingdom.`,
    10: (n) => `Persecution study. Talked through 2 Timothy 3:12. ${n} shared some pushback from family and we prayed about it together.`,
    11: (n) => `New Covenant Conversion. ${n} had great questions about baptism in Acts 2 and Romans 6. Took notes the whole time.`,
    12: (n) => `Cross study. Very emotional and meaningful. ${n} said this was the first time the cross felt personal.`,
    13: (n) => `Church study. ${n} wants to be part of the body and is excited about serving. Next is Count the Cost.`,
  };

  function phone(suffix) { return `+1951555${'01' + suffix}`; }

  function build() {
    const today = T.today();
    const people = [];
    const events = [];
    const reports = [];

    for (const [id, first, last, gender, chapter, talkId, role, ph, bd, sd, aliases] of DISCIPLES) {
      const [bm, bdd] = bd.split('-').map(Number);
      const [sy, sm, sdd] = sd.split('-').map(Number);
      people.push({
        personId: id, chapter, type: 'disciple', firstName: first, lastName: last, displayName: `${first} ${last}`,
        aliases, gender, talkId, role, membershipStatus: 'active', phone: phone(ph),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        birthday: { m: bm, d: bdd }, spirthday: { y: sy, m: sm, d: sdd },
      });
    }

    let ev = 0, rp = 0;
    for (const [id, first, last, gender, chapter, ph, steps] of STUDENTS) {
      const firstDay = T.shiftDay(today, steps[0][2] - 3);
      people.push({
        personId: id, chapter, type: 'student', firstName: first, lastName: last, displayName: `${first} ${last}`,
        aliases: [], gender, phone: phone(ph), email: null, createdAt: T.zonedToDate(firstDay.y, firstDay.m, firstDay.d, 12).toISOString(),
      });
      for (const [key, part, off, h, min, state, leader, organizer, rep, status] of steps) {
        const study = CATALOG.find((c) => c.key === key);
        const day = T.shiftDay(today, off);
        const start = T.zonedToDate(day.y, day.m, day.d, h, min);
        const end = new Date(start.getTime() + study.minutes * 60000);
        const orgPerson = people.find((p) => p.personId === organizer);
        const eventId = `e${++ev}`;
        events.push({
          id: eventId, chapter, studyKey: key, part, startsAt: start.toISOString(), endsAt: end.toISOString(),
          status: status || 'confirmed', audience: gender, studentId: id, leaderId: leader, organizerId: organizer,
          talkId: orgPerson ? orgPerson.talkId : null, createdById: organizer, location: null,
          source: state === 'i' ? 'imported' : 'martha',
          outcome: state === 'c' ? 'completed' : state === 'p' ? 'partial' : null,
        });
        if (rep) {
          reports.push({
            id: `r${++rp}`, eventId, body: REPORTS[rep](first), authorId: leader,
            createdAt: new Date(end.getTime() + 3 * 3600000).toISOString(), supersedesId: null,
          });
        }
      }
    }

    return {
      viewer: { personId: 'd1', chapters: ['ucr', 'cbu'], defaultChapter: 'ucr' },
      chapters: CHAPTERS, catalog: CATALOG, talks: TALKS, people, events, reports,
      devices: [
        { id: 'dev1', label: 'iPhone · Safari', lastSeen: new Date().toISOString(), current: true },
        { id: 'dev2', label: 'Mac · Chrome', lastSeen: new Date(Date.now() - 3 * 86400000).toISOString(), current: false },
      ],
    };
  }

  window.MarthaMock = { build, CATALOG };
})();
