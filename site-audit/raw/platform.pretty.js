import {
    r as e
} from "./rolldown-runtime-C60lm6uB.js";
import {
    i as t,
    n,
    r
} from "./framework-D_rUT4EX.js";
import i from "./sign-out-CD8864h2.js";
var a = e(t(), 1),
    o = [`Listening`, `Reading`, `Speaking`, `Writing`, `Vocabulary`],
    s = o.filter(e => ![`Speaking`, `Writing`].includes(e)),
    c = [{
        id: 1,
        title: `Food`,
        lessons: {
            Listening: [`balanced-diet`, `food-safety`, `food-labelling`],
            Reading: [`new-perspectives`, `traditional-farming`, `flavour-industry`],
            Speaking: [`speaking-1`, `speaking-2`, `speaking-3`, `speaking-4`, `speaking-5`],
            Writing: [`writing`],
            Vocabulary: [`vocabulary-menu`, `energy-vocabulary`, `definitions`, `compilation`]
        }
    }, {
        id: 2,
        title: `Health`,
        lessons: {
            Listening: [`health-centre`, `health-physical-activities`, `health-music-therapy`],
            Reading: [`health-in-the-wild`, `health-placebo-effect`, `health-saving-bugs`],
            Speaking: [`health-speaking-1`, `health-speaking-2`, `health-speaking-3`],
            Writing: [],
            Vocabulary: [`health-flashcards`, `health-glossary`, `health-vocabulary-exam`]
        }
    }, {
        id: 3,
        title: `Work`,
        lessons: {
            Listening: [`work-milos-restaurants`, `work-agriculture-careers`, `work-future-management`],
            Reading: [`work-workaholic-economy`, `work-teleworking`, `work-soviet-working-week`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`work-flashcards`, `work-glossary`, `work-vocabulary-worksheet`]
        }
    }, {
        id: 6,
        title: `Sports`,
        lessons: {
            Listening: [`sports-studies`, `sports-strength-training`, `sports-football-uk`],
            Reading: [`sports-fair-games`, `sports-higher-faster`, `sports-australia-success`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`sports-flashcards`, `sports-glossary`, `sports-vocabulary-worksheet`]
        }
    }, {
        id: 7,
        title: `Fashion and Clothes`,
        lessons: {
            Listening: [`fashion-pockets`, `fashion-sustainable`, `fashion-tshirt-life-cycle`],
            Reading: [`fashion-clothkits`, `fashion-male-body-image`, `fashion-indian-textiles`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`fashion-flashcards`, `fashion-glossary`, `fashion-vocabulary-worksheet`]
        }
    }, {
        id: 8,
        title: `Housing`,
        lessons: {
            Listening: [`housing-houses-future`, `housing-rented-properties`, `housing-underground-house`],
            Reading: [`housing-architecture`, `housing-food-stream`, `housing-moles-underground`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`housing-picture-dictionary`, `housing-flashcards`, `housing-glossary`, `housing-vocabulary-worksheet`]
        }
    }, {
        id: 9,
        title: `Media`,
        lessons: {
            Listening: [`media-newspaper-analysis`, `media-us-news-sources`, `media-writing-radio`],
            Reading: [`media-changing-channel`, `media-reading-screen`, `media-great-survivor`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`media-flashcards`, `media-glossary`, `media-vocabulary-worksheet`]
        }
    }, {
        id: 10,
        title: `Art`,
        lessons: {
            Listening: [`art-birds`, `art-harvard-museum`, `art-museum-collections`],
            Reading: [`art-artificial-artist`, `art-museums-public`, `art-photography`],
            Speaking: [],
            Writing: [],
            Vocabulary: [`art-flashcards`, `art-glossary`, `art-vocabulary-worksheet`]
        }
    }],
    l = c.map(e => ({
        ...e,
        lessons: Object.fromEntries(s.map(t => [t, e.lessons[t] || []]))
    })),
    u = Object.fromEntries(s.map(e => [e, l.flatMap(t => t.lessons[e])])),
    d = {
        Listening: [`food-groups`, `eat-when`, `health-forward-thinking`, `work-job-satisfaction`, `sports-brain`, `sports-athletic-progress`],
        Reading: [`organic-food`, `health-eight-hour-sleep`, `work-employment-underemployment`]
    };
Object.fromEntries(o.map(e => [e, [...c.flatMap(t => t.lessons[e] || []), ...d[e] || []]]));
var f = Object.values(u).flat().length;

function p(e) {
    return l.find(t => Object.values(t.lessons).flat().includes(e))
}

function m(e, t) {
    return u[t]?.includes(e) ?? !1
}
var h = {
        "art-museum-collections": `Museum Collections`,
        "art-vocabulary-worksheet": `Art Vocabulary Worksheet`,
        "art-birds": `Birds in Art`,
        "art-harvard-museum": `Harvard Art Museum`,
        "art-glossary": `Art Vocabulary Compilation`,
        "art-flashcards": `Art Vocabulary Flashcards`,
        "art-museums-public": `Museums of Fine Art and Their Public`,
        "art-artificial-artist": `Artificial Artist?`,
        "art-photography": `Photography`
    },
    g = {
        "media-flashcards": `Media Vocabulary Flashcards`,
        "media-glossary": `Media Vocabulary Compilation`,
        "media-vocabulary-worksheet": `Media Vocabulary Worksheet`,
        "media-us-news-sources": `US News Sources`,
        "media-newspaper-analysis": `Newspaper Analysis`,
        "media-writing-radio": `Writing for Radio`,
        "media-great-survivor": `The Great Survivor`,
        "media-changing-channel": `Changing the Channel`,
        "media-reading-screen": `Reading the Screen`
    },
    _ = {
        "housing-picture-dictionary": `Around the Home · Interactive Picture Dictionary`,
        "housing-flashcards": `Housing & At Home Vocabulary Flashcards`,
        "housing-glossary": `Housing & At Home Vocabulary Compilation`,
        "housing-vocabulary-worksheet": `Housing & At Home Vocabulary Worksheet`,
        "housing-houses-future": `Houses of the Future`,
        "housing-underground-house": `The Underground House`,
        "housing-rented-properties": `Rented Properties`,
        "housing-architecture": `Architecture - Reaching for the Sky`,
        "housing-food-stream": `Food-Stream Contracts`,
        "housing-moles-underground": `Moles Happy as Homes Go Underground`
    },
    v = {
        "fashion-glossary": `Fashion Vocabulary Compilation`,
        "fashion-flashcards": `Fashion Vocabulary Flashcards`,
        "fashion-vocabulary-worksheet": `Fashion Vocabulary Worksheet`,
        "fashion-sustainable": `Sustainable Fashion`,
        "fashion-tshirt-life-cycle": `The Life Cycle of a T-shirt`,
        "fashion-pockets": `Pockets`,
        "fashion-clothkits": `A Home-Sewing Revival - The Return of Clothkits`,
        "fashion-indian-textiles": `Trends in the Indian Fashion and Textile Industries`,
        "fashion-male-body-image": `Changes in Male Body Image`
    },
    y = {
        "sports-glossary": `Sports Vocabulary Compilation`,
        "sports-vocabulary-worksheet": `Sports Vocabulary Worksheet`,
        "sports-strength-training": `Strength Training`,
        "sports-studies": `Sports Studies`,
        "sports-fair-games": `Fair Games?`,
        "sports-higher-faster": `How Much Higher? How Much Faster?`,
        "sports-brain": `Sports & Your Brain`,
        "sports-flashcards": `Sports Vocabulary Flashcards`,
        "sports-athletic-progress": `Athletic Progress`
    },
    b = {
        "work-workaholic-economy": `A Workaholic Economy`,
        "work-soviet-working-week": `Changes to the Soviet Union’s Working Week`,
        "work-flashcards": `Work Vocabulary Flashcards`,
        "work-employment-underemployment": `Employment, Underemployment and Unemployment`,
        "work-vocabulary-worksheet": `Work Vocabulary Worksheet`,
        "work-milos-restaurants": `Working at Milo’s Restaurants`,
        "work-future-management": `The Future of Management`,
        "work-job-satisfaction": `Job Satisfaction Study`,
        "work-teleworking": `Teleworking`,
        "work-agriculture-careers": `Agriculture & Horticulture Careers`,
        "work-glossary": `Work Vocabulary Compilation`
    };

function x(e) {
    return {
        "food-labelling": `Food Labelling`,
        "sports-football-uk": `Football in the UK`,
        "sports-australia-success": `Australia’s Sporting Success`
    } [e] || h[e] || g[e] || _[e] || v[e] || y[e] || b[e] || {
        "health-speaking-1": `Why antibiotics do not cure a cold`,
        "health-speaking-2": `Understanding different approaches to medicine`,
        "health-speaking-3": `Why regular movement matters more than a fitness burst`,
        "health-flashcards": `Health Vocabulary Flashcards`,
        "health-glossary": `Health Vocabulary Compilation`,
        "health-vocabulary-exam": `Health Vocabulary Exam`,
        "health-centre": `Health Centre`,
        "health-forward-thinking": `Forward Thinking`,
        "health-music-therapy": `Music Therapy`,
        "health-physical-activities": `Physical Activities`,
        "health-in-the-wild": `Health in the Wild`,
        "health-placebo-effect": `Placebo Effect — The Power of Nothing`,
        "health-eight-hour-sleep": `The Myth of the Eight-hour Sleep`,
        "health-saving-bugs": `Saving Bugs to Find New Drugs`
    } [e] || e.replace(/-/g, ` `).replace(/\b\w/g, e => e.toUpperCase())
}

function S(e) {
    return [`food-labelling`, `sports-football-uk`].includes(e) ? `/food/ielts/index.html` : u.Reading.includes(e) ? `/food/reading/index.html` : p(e)?.id === 10 ? [`art-flashcards`, `art-glossary`, `art-vocabulary-worksheet`].includes(e) ? `/food/art/study.html` : `/food/art/index.html` : p(e)?.id === 9 ? [`media-flashcards`, `media-glossary`, `media-vocabulary-worksheet`].includes(e) ? `/food/media/study.html` : `/food/media/index.html` : p(e)?.id === 8 ? e === `housing-picture-dictionary` ? `/food/housing/picture.html` : [`housing-flashcards`, `housing-glossary`, `housing-vocabulary-worksheet`].includes(e) ? `/food/housing/study.html` : `/food/housing/index.html` : p(e)?.id === 7 ? [`fashion-flashcards`, `fashion-glossary`, `fashion-vocabulary-worksheet`].includes(e) ? `/food/fashion/study.html` : `/food/fashion/index.html` : p(e)?.id === 6 ? [`sports-flashcards`, `sports-glossary`, `sports-vocabulary-worksheet`].includes(e) ? `/food/sports/study.html` : `/food/sports/index.html` : p(e)?.id === 3 ? [`work-flashcards`, `work-glossary`, `work-vocabulary-worksheet`].includes(e) ? `/food/work/study.html` : `/food/work/index.html` : p(e)?.id === 2 ? e.startsWith(`health-speaking-`) || [`health-flashcards`, `health-glossary`, `health-vocabulary-exam`].includes(e) ? `/food/health/study.html` : `/food/health/index.html` : `/food/index.html`
}
var C = [{
    id: `ielts-senior-1`,
    name: `IELTS Senior 1`
}, {
    id: `ielts-senior-3`,
    name: `IELTS Senior 3`
}];

function w(e) {
    return typeof e == `string` && C.some(t => t.id === e)
}

function T(e, t) {
    let n = l.find(t => t.id === e);
    if (!n) return {
        completed: 0,
        total: 0,
        percent: 0
    };
    let r = Object.values(n.lessons).flat(),
        i = new Set(t.filter(e => m(e.lesson_id, e.skill) && [`submitted`, `reviewed`].includes(e.status)).map(e => e.lesson_id)),
        a = r.filter(e => i.has(e)).length;
    return {
        completed: a,
        total: r.length,
        percent: r.length ? Math.floor(a / r.length * 100) : 0
    }
}

function E(e, t) {
    let n = l.findIndex(t => t.id === e);
    return n < 0 ? [] : l.slice(0, n).filter(e => t !== `ielts-senior-1` || e.id >= 7)
}

function D(e, t) {
    let n = E(e, t);
    return t === `ielts-senior-1` ? `Complete ${n.map(e=>`Topic ${e.id} (${e.title})`).join(` and `)} to 100% to unlock this topic.` : `Complete ${n.at(-1)?.title||`the previous topic`} and all earlier topics to 100% to unlock this topic.`
}
var O = e => !!e && [`submitted`, `reviewed`].includes(e.status) && e.completion?.ready !== !1;

function k(e, t, n) {
    let r = l.find(t => t.id === e),
        i = new Map;
    for (let e of t) {
        if (!r?.lessons[e.skill]?.includes(e.lesson_id)) continue;
        let t = i.get(e.lesson_id);
        (!t || (e.updated_at || 0) >= (t.updated_at || 0)) && i.set(e.lesson_id, e)
    }
    let a = Object.fromEntries(s.map(e => {
            let t = r?.lessons[e] || [],
                n = t.filter(e => O(i.get(e))).length,
                a = t.filter(e => {
                    let t = i.get(e);
                    return t && !O(t) && (t.completion ? t.completion.completed > 0 : t.status === `in_progress`)
                }).length;
            return [e, {
                completed: n,
                total: t.length,
                inProgress: a,
                percent: t.length ? Math.floor(n / t.length * 100) : null
            }]
        })),
        o = Object.values(a).reduce((e, t) => e + t.total, 0),
        c = Object.values(a).reduce((e, t) => e + t.completed, 0),
        u = Object.values(a).reduce((e, t) => e + t.inProgress, 0),
        d = o > 0 && c === o,
        f = l.findIndex(t => t.id === e),
        p = f < 0 ? void 0 : l[f + 1],
        m = f >= 0 && E(e, n).every(e => Object.entries(e.lessons).every(([e, n]) => n.every(n => t.some(t => t.lesson_id === n && t.skill === e && O(t)))));
    return {
        bySkill: a,
        completed: c,
        total: o,
        inProgress: u,
        percent: o ? Math.floor(c / o * 100) : 0,
        complete: d,
        ready: d && m,
        nextTitle: p?.title || null
    }
}

function A(e, t, n, r = () => void 0) {
    let i = t.map(t => k(e, n.filter(e => e.student_id === t), r(t))),
        a = i.reduce((e, t) => e + t.completed, 0),
        o = i.reduce((e, t) => e + t.total, 0);
    return {
        students: t.length,
        finished: i.filter(e => e.complete).length,
        ready: i.filter(e => e.ready).length,
        completed: a,
        total: o,
        percent: o ? Math.floor(a / o * 100) : 0,
        bySkill: Object.fromEntries(s.map(e => {
            let t = i.reduce((t, n) => t + n.bySkill[e].total, 0),
                n = i.reduce((t, n) => t + n.bySkill[e].completed, 0);
            return [e, {
                total: t,
                completed: n,
                percent: t ? Math.floor(n / t * 100) : null,
                finished: i.filter(t => t.bySkill[e].total > 0 && t.bySkill[e].completed === t.bySkill[e].total).length
            }]
        }))
    }
}

function j(e) {
    if (e <= 0) return `Not recorded yet`;
    if (e < 60) return `<1 min`;
    let t = Math.floor(e / 60);
    return t < 60 ? `${t} min` : `${Math.floor(t/60)} h${t%60?` ${t%60} min`:``}`
}
var M = Object.defineProperty,
    N = (e, t) => M(e, `name`, {
        value: t,
        configurable: !0
    });

function P(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
N(P, `setRef`);

function F(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = P(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : P(e[t], null)
            }
        }
    }
}
N(F, `composeRefs`);

function I(...e) {
    return a.useCallback(F(...e), e)
}
N(I, `useComposedRefs`);
var ee = Object.defineProperty,
    L = (e, t) => ee(e, `name`, {
        value: t,
        configurable: !0
    });

function te(e) {
    let t = a.forwardRef((t, n) => {
        let {
            children: r,
            ...i
        } = t, o = null, s = !1, c = [];
        oe(r) && typeof ue == `function` && (r = ue(r._payload)), a.Children.forEach(r, e => {
            if (B(e)) {
                s = !0;
                let t = e,
                    n = `child` in t.props ? t.props.child : t.props.children;
                oe(n) && typeof ue == `function` && (n = ue(n._payload)), o = z(t, n), c.push(o?.props?.children)
            } else c.push(e)
        }), o ? o = a.cloneElement(o, void 0, c) : !s && a.Children.count(r) === 1 && a.isValidElement(r) && (o = r);
        let l = o ? ie(o) : void 0,
            u = I(n, l);
        if (!o) {
            if (r || r === 0) throw Error(s ? le(e) : ce(e));
            return r
        }
        let d = re(i, o.props ?? {});
        return o.type !== a.Fragment && (d.ref = n ? u : l), a.cloneElement(o, d)
    });
    return t.displayName = `${e}.Slot`, t
}
L(te, `createSlot`);
var ne = Symbol.for(`radix.slottable`);

function R(e) {
    let t = L(e => `child` in e ? e.children(e.child) : e.children, `Slottable`);
    return t.displayName = `${e}.Slottable`, t.__radixId = ne, t
}
L(R, `createSlottable`);
var z = L((e, t) => {
    if (`child` in e.props) {
        let t = e.props.child;
        return a.isValidElement(t) ? a.cloneElement(t, void 0, e.props.children(t.props.children)) : null
    }
    return a.isValidElement(t) ? t : null
}, `getSlottableElementFromSlottable`);

function re(e, t) {
    let n = {
        ...t
    };
    for (let r in t) {
        let i = e[r],
            a = t[r];
        /^on[A-Z]/.test(r) ? i && a ? n[r] = (...e) => {
            let t = a(...e);
            return i(...e), t
        } : i && (n[r] = i) : r === `style` ? n[r] = {
            ...i,
            ...a
        } : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `))
    }
    return {
        ...e,
        ...n
    }
}
L(re, `mergeProps`);

function ie(e) {
    let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
        n = t && `isReactWarning` in t && t.isReactWarning;
    return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, `ref`)?.get, n = t && `isReactWarning` in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref)
}
L(ie, `getElementRef`);

function B(e) {
    return a.isValidElement(e) && typeof e.type == `function` && `__radixId` in e.type && e.type.__radixId === ne
}
L(B, `isSlottable`);
var ae = Symbol.for(`react.lazy`);

function oe(e) {
    return typeof e == `object` && !!e && `$$typeof` in e && e.$$typeof === ae && `_payload` in e && se(e._payload)
}
L(oe, `isLazyComponent`);

function se(e) {
    return typeof e == `object` && !!e && `then` in e
}
L(se, `isPromiseLike`);
var ce = L(e => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, `createSlotError`),
    le = L(e => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, `createSlottableError`),
    ue = a.use,
    de = e(n(), 1),
    V = r(),
    fe = Object.defineProperty,
    pe = (e, t) => fe(e, `name`, {
        value: t,
        configurable: !0
    }),
    H = [`a`, `button`, `div`, `form`, `h2`, `h3`, `img`, `input`, `label`, `li`, `nav`, `ol`, `p`, `select`, `span`, `svg`, `ul`].reduce((e, t) => {
        let n = te(`Primitive.${t}`),
            r = a.forwardRef((e, r) => {
                let {
                    asChild: i,
                    ...a
                } = e, o = i ? n : t;
                return window[Symbol.for(`radix-ui`)] = !0, (0, V.jsx)(o, {
                    ...a,
                    ref: r
                })
            });
        return r.displayName = `Primitive.${t}`, {
            ...e,
            [t]: r
        }
    }, {});

function me(e, t) {
    e && de.flushSync(() => e.dispatchEvent(t))
}
pe(me, `dispatchDiscreteCustomEvent`);
var he = Object.freeze({
        position: `absolute`,
        border: 0,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: `hidden`,
        clip: `rect(0, 0, 0, 0)`,
        whiteSpace: `nowrap`,
        wordWrap: `normal`
    }),
    ge = Object.defineProperty,
    U = (e, t) => ge(e, `name`, {
        value: t,
        configurable: !0
    });

function _e(e, t) {
    let n = a.createContext(t);
    n.displayName = e + `Context`;
    let r = U(e => {
        let {
            children: t,
            ...r
        } = e, i = a.useMemo(() => r, Object.values(r));
        return (0, V.jsx)(n.Provider, {
            value: i,
            children: t
        })
    }, `Provider`);
    r.displayName = e + `Provider`;

    function i(r, i = {}) {
        let {
            optional: o = !1
        } = i, s = a.useContext(n);
        if (s) return s;
        if (t !== void 0) return t;
        if (!o) throw Error(`\`${r}\` must be used within \`${e}\``)
    }
    return U(i, `useContext`), [r, i]
}
U(_e, `createContext`);

function W(e, t = []) {
    let n = [];

    function r(t, r) {
        let i = a.createContext(r);
        i.displayName = t + `Context`;
        let o = n.length;
        n = [...n, r];
        let s = U(t => {
            let {
                scope: n,
                children: r,
                ...s
            } = t, c = n?.[e]?.[o] || i, l = a.useMemo(() => s, Object.values(s));
            return (0, V.jsx)(c.Provider, {
                value: l,
                children: r
            })
        }, `Provider`);
        s.displayName = t + `Provider`;

        function c(n, s, c = {}) {
            let {
                optional: l = !1
            } = c, u = s?.[e]?.[o] || i, d = a.useContext(u);
            if (d) return d;
            if (r !== void 0) return r;
            if (!l) throw Error(`\`${n}\` must be used within \`${t}\``)
        }
        return U(c, `useContext`), [s, c]
    }
    U(r, `createContext`);
    let i = U(() => {
        let t = n.map(e => a.createContext(e));
        return U(function(n) {
            let r = n?.[e] || t;
            return a.useMemo(() => ({
                [`__scope${e}`]: {
                    ...n,
                    [e]: r
                }
            }), [n, r])
        }, `useScope`)
    }, `createScope`);
    return i.scopeName = e, [r, ve(i, ...t)]
}
U(W, `createContextScope`);

function ve(...e) {
    let t = e[0];
    if (e.length === 1) return t;
    let n = U(() => {
        let n = e.map(e => ({
            useScope: e(),
            scopeName: e.scopeName
        }));
        return U(function(e) {
            let r = n.reduce((t, {
                useScope: n,
                scopeName: r
            }) => {
                let i = n(e)[`__scope${r}`];
                return {
                    ...t,
                    ...i
                }
            }, {});
            return a.useMemo(() => ({
                [`__scope${t.scopeName}`]: r
            }), [r])
        }, `useComposedScopes`)
    }, `createScope`);
    return n.scopeName = t.scopeName, n
}
U(ve, `composeContextScopes`);
var ye = Object.defineProperty,
    be = (e, t) => ye(e, `name`, {
        value: t,
        configurable: !0
    });

function xe(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
be(xe, `setRef`);

function Se(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = xe(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : xe(e[t], null)
            }
        }
    }
}
be(Se, `composeRefs`);

function Ce(...e) {
    return a.useCallback(Se(...e), e)
}
be(Ce, `useComposedRefs`);
var we = Object.defineProperty,
    Te = (e, t) => we(e, `name`, {
        value: t,
        configurable: !0
    });

function Ee(e) {
    let t = a.forwardRef((t, n) => {
        let {
            children: r,
            ...i
        } = t, o = null, s = !1, c = [];
        Pe(r) && typeof Re == `function` && (r = Re(r._payload)), a.Children.forEach(r, e => {
            if (Me(e)) {
                s = !0;
                let t = e,
                    n = `child` in t.props ? t.props.child : t.props.children;
                Pe(n) && typeof Re == `function` && (n = Re(n._payload)), o = ke(t, n), c.push(o?.props?.children)
            } else c.push(e)
        }), o ? o = a.cloneElement(o, void 0, c) : !s && a.Children.count(r) === 1 && a.isValidElement(r) && (o = r);
        let l = o ? je(o) : void 0,
            u = Ce(n, l);
        if (!o) {
            if (r || r === 0) throw Error(s ? Le(e) : Ie(e));
            return r
        }
        let d = Ae(i, o.props ?? {});
        return o.type !== a.Fragment && (d.ref = n ? u : l), a.cloneElement(o, d)
    });
    return t.displayName = `${e}.Slot`, t
}
Te(Ee, `createSlot`);
var De = Symbol.for(`radix.slottable`);

function Oe(e) {
    let t = Te(e => `child` in e ? e.children(e.child) : e.children, `Slottable`);
    return t.displayName = `${e}.Slottable`, t.__radixId = De, t
}
Te(Oe, `createSlottable`);
var ke = Te((e, t) => {
    if (`child` in e.props) {
        let t = e.props.child;
        return a.isValidElement(t) ? a.cloneElement(t, void 0, e.props.children(t.props.children)) : null
    }
    return a.isValidElement(t) ? t : null
}, `getSlottableElementFromSlottable`);

function Ae(e, t) {
    let n = {
        ...t
    };
    for (let r in t) {
        let i = e[r],
            a = t[r];
        /^on[A-Z]/.test(r) ? i && a ? n[r] = (...e) => {
            let t = a(...e);
            return i(...e), t
        } : i && (n[r] = i) : r === `style` ? n[r] = {
            ...i,
            ...a
        } : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `))
    }
    return {
        ...e,
        ...n
    }
}
Te(Ae, `mergeProps`);

function je(e) {
    let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
        n = t && `isReactWarning` in t && t.isReactWarning;
    return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, `ref`)?.get, n = t && `isReactWarning` in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref)
}
Te(je, `getElementRef`);

function Me(e) {
    return a.isValidElement(e) && typeof e.type == `function` && `__radixId` in e.type && e.type.__radixId === De
}
Te(Me, `isSlottable`);
var Ne = Symbol.for(`react.lazy`);

function Pe(e) {
    return typeof e == `object` && !!e && `$$typeof` in e && e.$$typeof === Ne && `_payload` in e && Fe(e._payload)
}
Te(Pe, `isLazyComponent`);

function Fe(e) {
    return typeof e == `object` && !!e && `then` in e
}
Te(Fe, `isPromiseLike`);
var Ie = Te(e => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, `createSlotError`),
    Le = Te(e => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, `createSlottableError`),
    Re = a.use,
    ze = Object.defineProperty,
    G = (e, t) => ze(e, `name`, {
        value: t,
        configurable: !0
    });

function Be(e) {
    let t = e + `CollectionProvider`,
        [n, r] = W(t),
        [i, o] = n(t, {
            collectionRef: {
                current: null
            },
            itemMap: new Map
        }),
        s = G(e => {
            let {
                scope: t,
                children: n
            } = e, r = a.useRef(null), o = a.useRef(new Map).current;
            return (0, V.jsx)(i, {
                scope: t,
                itemMap: o,
                collectionRef: r,
                children: n
            })
        }, `CollectionProvider`);
    s.displayName = t;
    let c = e + `CollectionSlot`,
        l = Ee(c),
        u = a.forwardRef((e, t) => {
            let {
                scope: n,
                children: r
            } = e;
            return (0, V.jsx)(l, {
                ref: Ce(t, o(c, n).collectionRef),
                children: r
            })
        });
    u.displayName = c;
    let d = e + `CollectionItemSlot`,
        f = `data-radix-collection-item`,
        p = Ee(d),
        m = a.forwardRef((e, t) => {
            let {
                scope: n,
                children: r,
                ...i
            } = e, s = a.useRef(null), c = Ce(t, s), l = o(d, n);
            return a.useEffect(() => (l.itemMap.set(s, {
                ref: s,
                ...i
            }), () => void l.itemMap.delete(s))), (0, V.jsx)(p, {
                [f]: ``,
                ref: c,
                children: r
            })
        });
    m.displayName = d;

    function h(t) {
        let n = o(e + `CollectionConsumer`, t);
        return a.useCallback(() => {
            let e = n.collectionRef.current;
            if (!e) return [];
            let t = Array.from(e.querySelectorAll(`[${f}]`));
            return Array.from(n.itemMap.values()).sort((e, n) => t.indexOf(e.ref.current) - t.indexOf(n.ref.current))
        }, [n.collectionRef, n.itemMap])
    }
    return G(h, `useCollection`), [{
        Provider: s,
        Slot: u,
        ItemSlot: m
    }, h, r]
}
G(Be, `createCollection`);
var Ve = new WeakMap,
    He = class e extends Map {
        static {
            G(this, `OrderedDict`)
        }
        #e;
        constructor(e) {
            super(e), this.#e = [...super.keys()], Ve.set(this, !0)
        }
        set(e, t) {
            return Ve.get(this) && (this.has(e) ? this.#e[this.#e.indexOf(e)] = e : this.#e.push(e)), super.set(e, t), this
        }
        insert(e, t, n) {
            let r = this.has(t),
                i = this.#e.length,
                a = Ge(e),
                o = a >= 0 ? a : i + a,
                s = o < 0 || o >= i ? -1 : o;
            if (s === this.size || r && s === this.size - 1 || s === -1) return this.set(t, n), this;
            let c = this.size + +!r;
            a < 0 && o++;
            let l = [...this.#e],
                u, d = !1;
            for (let e = o; e < c; e++)
                if (o === e) {
                    let i = l[e];
                    l[e] === t && (i = l[e + 1]), r && this.delete(t), u = this.get(i), this.set(t, n)
                } else {
                    !d && l[e - 1] === t && (d = !0);
                    let n = l[d ? e : e - 1],
                        r = u;
                    u = this.get(n), this.delete(n), this.set(n, r)
                } return this
        }
        with(t, n, r) {
            let i = new e(this);
            return i.insert(t, n, r), i
        }
        before(e) {
            let t = this.#e.indexOf(e) - 1;
            if (!(t < 0)) return this.entryAt(t)
        }
        setBefore(e, t, n) {
            let r = this.#e.indexOf(e);
            return r === -1 ? this : this.insert(r, t, n)
        }
        after(e) {
            let t = this.#e.indexOf(e);
            if (t = t === -1 || t === this.size - 1 ? -1 : t + 1, t !== -1) return this.entryAt(t)
        }
        setAfter(e, t, n) {
            let r = this.#e.indexOf(e);
            return r === -1 ? this : this.insert(r + 1, t, n)
        }
        first() {
            return this.entryAt(0)
        }
        last() {
            return this.entryAt(-1)
        }
        clear() {
            return this.#e = [], super.clear()
        }
        delete(e) {
            let t = super.delete(e);
            return t && this.#e.splice(this.#e.indexOf(e), 1), t
        }
        deleteAt(e) {
            let t = this.keyAt(e);
            return t === void 0 ? !1 : this.delete(t)
        }
        at(e) {
            let t = Ue(this.#e, e);
            if (t !== void 0) return this.get(t)
        }
        entryAt(e) {
            let t = Ue(this.#e, e);
            if (t !== void 0) return [t, this.get(t)]
        }
        indexOf(e) {
            return this.#e.indexOf(e)
        }
        keyAt(e) {
            return Ue(this.#e, e)
        }
        from(e, t) {
            let n = this.indexOf(e);
            if (n === -1) return;
            let r = n + t;
            return r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.at(r)
        }
        keyFrom(e, t) {
            let n = this.indexOf(e);
            if (n === -1) return;
            let r = n + t;
            return r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.keyAt(r)
        }
        find(e, t) {
            let n = 0;
            for (let r of this) {
                if (Reflect.apply(e, t, [r, n, this])) return r;
                n++
            }
        }
        findIndex(e, t) {
            let n = 0;
            for (let r of this) {
                if (Reflect.apply(e, t, [r, n, this])) return n;
                n++
            }
            return -1
        }
        filter(t, n) {
            let r = [],
                i = 0;
            for (let e of this) Reflect.apply(t, n, [e, i, this]) && r.push(e), i++;
            return new e(r)
        }
        map(t, n) {
            let r = [],
                i = 0;
            for (let e of this) r.push([e[0], Reflect.apply(t, n, [e, i, this])]), i++;
            return new e(r)
        }
        reduce(...e) {
            let [t, n] = e, r = 0, i = n ?? this.at(0);
            for (let n of this) i = r === 0 && e.length === 1 ? n : Reflect.apply(t, this, [i, n, r, this]), r++;
            return i
        }
        reduceRight(...e) {
            let [t, n] = e, r = n ?? this.at(-1);
            for (let n = this.size - 1; n >= 0; n--) {
                let i = this.at(n);
                r = n === this.size - 1 && e.length === 1 ? i : Reflect.apply(t, this, [r, i, n, this])
            }
            return r
        }
        toSorted(t) {
            return new e([...this.entries()].sort(t))
        }
        toReversed() {
            let t = new e;
            for (let e = this.size - 1; e >= 0; e--) {
                let n = this.keyAt(e),
                    r = this.get(n);
                t.set(n, r)
            }
            return t
        }
        toSpliced(...t) {
            let n = [...this.entries()];
            return n.splice(...t), new e(n)
        }
        slice(t, n) {
            let r = new e,
                i = this.size - 1;
            if (t === void 0) return r;
            t < 0 && (t += this.size), n !== void 0 && n > 0 && (i = n - 1);
            for (let e = t; e <= i; e++) {
                let t = this.keyAt(e),
                    n = this.get(t);
                r.set(t, n)
            }
            return r
        }
        every(e, t) {
            let n = 0;
            for (let r of this) {
                if (!Reflect.apply(e, t, [r, n, this])) return !1;
                n++
            }
            return !0
        }
        some(e, t) {
            let n = 0;
            for (let r of this) {
                if (Reflect.apply(e, t, [r, n, this])) return !0;
                n++
            }
            return !1
        }
    };

function Ue(e, t) {
    if (`at` in Array.prototype) return Array.prototype.at.call(e, t);
    let n = We(e, t);
    return n === -1 ? void 0 : e[n]
}
G(Ue, `at`);

function We(e, t) {
    let n = e.length,
        r = Ge(t),
        i = r >= 0 ? r : n + r;
    return i < 0 || i >= n ? -1 : i
}
G(We, `toSafeIndex`);

function Ge(e) {
    return e !== e || e === 0 ? 0 : Math.trunc(e)
}
G(Ge, `toSafeInteger`);

function Ke(e) {
    let t = e + `CollectionProvider`,
        [n, r] = W(t),
        [i, o] = n(t, {
            collectionElement: null,
            collectionRef: {
                current: null
            },
            collectionRefObject: {
                current: null
            },
            itemMap: new He,
            setItemMap: G(() => void 0, `setItemMap`)
        }),
        s = G(({
            state: e,
            ...t
        }) => e ? (0, V.jsx)(l, {
            ...t,
            state: e
        }) : (0, V.jsx)(c, {
            ...t
        }), `CollectionProvider`);
    s.displayName = t;
    let c = G(e => {
        let t = g();
        return (0, V.jsx)(l, {
            ...e,
            state: t
        })
    }, `CollectionInit`);
    c.displayName = t + `Init`;
    let l = G(e => {
        let {
            scope: t,
            children: n,
            state: r
        } = e, o = a.useRef(null), [s, c] = a.useState(null), l = Ce(o, c), [u, d] = r;
        return a.useEffect(() => {
            if (!s) return;
            let e = Xe(() => {});
            return e.observe(s, {
                childList: !0,
                subtree: !0
            }), () => {
                e.disconnect()
            }
        }, [s]), (0, V.jsx)(i, {
            scope: t,
            itemMap: u,
            setItemMap: d,
            collectionRef: l,
            collectionRefObject: o,
            collectionElement: s,
            children: n
        })
    }, `CollectionProviderImpl`);
    l.displayName = t + `Impl`;
    let u = e + `CollectionSlot`,
        d = Ee(u),
        f = a.forwardRef((e, t) => {
            let {
                scope: n,
                children: r
            } = e;
            return (0, V.jsx)(d, {
                ref: Ce(t, o(u, n).collectionRef),
                children: r
            })
        });
    f.displayName = u;
    let p = e + `CollectionItemSlot`,
        m = Ee(p),
        h = a.forwardRef((e, t) => {
            let {
                scope: n,
                children: r,
                ...i
            } = e, s = a.useRef(null), [c, l] = a.useState(null), u = Ce(t, s, l), {
                setItemMap: d
            } = o(p, n), f = a.useRef(i);
            qe(f.current, i) || (f.current = i);
            let h = f.current;
            return a.useEffect(() => {
                let e = h;
                return d(t => c ? t.has(c) ? t.set(c, {
                    ...e,
                    element: c
                }).toSorted(Ye) : (t.set(c, {
                    ...e,
                    element: c
                }), t.toSorted(Ye)) : t), () => {
                    d(e => !c || !e.has(c) ? e : (e.delete(c), new He(e)))
                }
            }, [c, h, d]), (0, V.jsx)(m, {
                "data-radix-collection-item": ``,
                ref: u,
                children: r
            })
        });
    h.displayName = p;

    function g() {
        return a.useState(new He)
    }
    G(g, `useInitCollection`);

    function _(t) {
        let {
            itemMap: n
        } = o(e + `CollectionConsumer`, t);
        return n
    }
    return G(_, `useCollection`), [{
        Provider: s,
        Slot: f,
        ItemSlot: h
    }, {
        createCollectionScope: r,
        useCollection: _,
        useInitCollection: g
    }]
}
G(Ke, `createCollection`);

function qe(e, t) {
    if (e === t) return !0;
    if (typeof e != `object` || typeof t != `object` || e == null || t == null) return !1;
    let n = Object.keys(e),
        r = Object.keys(t);
    if (n.length !== r.length) return !1;
    for (let r of n)
        if (!Object.prototype.hasOwnProperty.call(t, r) || e[r] !== t[r]) return !1;
    return !0
}
G(qe, `shallowEqual`);

function Je(e, t) {
    return !!(t.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING)
}
G(Je, `isElementPreceding`);

function Ye(e, t) {
    return !e[1].element || !t[1].element ? 0 : Je(e[1].element, t[1].element) ? -1 : 1
}
G(Ye, `sortByDocumentPosition`);

function Xe(e) {
    return new MutationObserver(t => {
        for (let n of t)
            if (n.type === `childList`) {
                e();
                return
            }
    })
}
G(Xe, `getChildListObserver`);
var Ze = Object.defineProperty,
    Qe = (e, t) => Ze(e, `name`, {
        value: t,
        configurable: !0
    }),
    $e = !!(window.document && window.document.createElement);

function K(e, t, {
    checkForDefaultPrevented: n = !0
} = {}) {
    return Qe(function(r) {
        if (e?.(r), n === !1 || !r || !r.defaultPrevented) return t?.(r)
    }, `handleEvent`)
}
Qe(K, `composeEventHandlers`);

function et(e) {
    if (!$e) throw Error(`Cannot access window outside of the DOM`);
    return e?.ownerDocument?.defaultView ?? window
}
Qe(et, `getOwnerWindow`);

function tt(e) {
    if (!$e) throw Error(`Cannot access document outside of the DOM`);
    return e?.ownerDocument ?? document
}
Qe(tt, `getOwnerDocument`);

function nt(e, t = !1) {
    let {
        activeElement: n
    } = tt(e);
    if (!n?.nodeName) return null;
    if (rt(n) && n.contentDocument) return nt(n.contentDocument.body, t);
    if (t) {
        let e = n.getAttribute(`aria-activedescendant`);
        if (e) {
            let t = tt(n).getElementById(e);
            if (t) return t
        }
    }
    return n
}
Qe(nt, `getActiveElement`);

function rt(e) {
    return e.tagName === `IFRAME`
}
Qe(rt, `isFrame`);
var q = globalThis?.document ? a.useLayoutEffect : () => {},
    it = Object.defineProperty,
    at = (e, t) => it(e, `name`, {
        value: t,
        configurable: !0
    }),
    ot = a.useEffectEvent,
    st = a.useInsertionEffect;

function ct(e) {
    if (typeof ot == `function`) return ot(e);
    let t = a.useRef(() => {
        throw Error(`Cannot call an event handler while rendering.`)
    });
    return typeof st == `function` ? st(() => {
        t.current = e
    }) : q(() => {
        t.current = e
    }), a.useMemo(() => ((...e) => t.current?.(...e)), [])
}
at(ct, `useEffectEvent`);
var lt = Object.defineProperty,
    ut = (e, t) => lt(e, `name`, {
        value: t,
        configurable: !0
    }),
    dt = a.useInsertionEffect || q;

function ft({
    prop: e,
    defaultProp: t,
    onChange: n = ut(() => {}, `onChange`),
    caller: r
}) {
    let [i, o, s] = pt({
        defaultProp: t,
        onChange: n
    }), c = e !== void 0;
    return [c ? e : i, a.useCallback(t => {
        if (c) {
            let n = mt(t) ? t(e) : t;
            n !== e && s.current?.(n)
        } else o(t)
    }, [c, e, o, s])]
}
ut(ft, `useControllableState`);

function pt({
    defaultProp: e,
    onChange: t
}) {
    let [n, r] = a.useState(e), i = a.useRef(n), o = a.useRef(t);
    return dt(() => {
        o.current = t
    }, [t]), a.useEffect(() => {
        i.current !== n && (o.current?.(n), i.current = n)
    }, [n, i]), [n, r, o]
}
ut(pt, `useUncontrolledState`);

function mt(e) {
    return typeof e == `function`
}
ut(mt, `isFunction`);
var ht = Symbol(`RADIX:SYNC_STATE`);

function gt(e, t, n, r) {
    let {
        prop: i,
        defaultProp: o,
        onChange: s,
        caller: c
    } = t, l = i !== void 0, u = ct(s), d = [{
        ...n,
        state: o
    }];
    r && d.push(r);
    let [f, p] = a.useReducer((t, n) => {
        if (n.type === ht) return {
            ...t,
            state: n.state
        };
        let r = e(t, n);
        return l && !Object.is(r.state, t.state) && u(r.state), r
    }, ...d), m = f.state, h = a.useRef(m);
    a.useEffect(() => {
        h.current !== m && (h.current = m, l || u(m))
    }, [m, h, l]);
    let g = a.useMemo(() => i === void 0 ? f : {
        ...f,
        state: i
    }, [f, i]);
    return a.useEffect(() => {
        l && !Object.is(i, f.state) && p({
            type: ht,
            state: i
        })
    }, [i, f.state, l]), [g, p]
}
ut(gt, `useControllableStateReducer`);
var _t = Object.defineProperty,
    vt = (e, t) => _t(e, `name`, {
        value: t,
        configurable: !0
    });

function yt(e, t) {
    return a.useReducer((e, n) => t[e][n] ?? e, e)
}
vt(yt, `useStateMachine`);
var bt = vt(e => {
    let {
        present: t,
        children: n
    } = e, r = xt(t), i = typeof n == `function` ? n({
        present: r.isPresent
    }) : a.Children.only(n), o = Ct(r.ref, Tt(i));
    return typeof n == `function` || r.isPresent ? a.cloneElement(i, {
        ref: o
    }) : null
}, `Presence`);

function xt(e) {
    let [t, n] = a.useState(), r = a.useRef(null), i = a.useRef(e), o = a.useRef(`none`), s = a.useRef(void 0), [c, l] = yt(e ? `mounted` : `unmounted`, {
        mounted: {
            UNMOUNT: `unmounted`,
            ANIMATION_OUT: `unmountSuspended`
        },
        unmountSuspended: {
            MOUNT: `mounted`,
            ANIMATION_END: `unmounted`
        },
        unmounted: {
            MOUNT: `mounted`
        }
    });
    return a.useEffect(() => {
        c === `mounted` ? (o.current = s.current ?? wt(r.current), s.current = void 0) : o.current = `none`
    }, [c]), q(() => {
        let t = r.current,
            n = i.current;
        if (n !== e) {
            let r = o.current,
                a = wt(t);
            e ? (s.current = a, l(`MOUNT`)) : a === `none` || t?.display === `none` ? l(`UNMOUNT`) : l(n && r !== a ? `ANIMATION_OUT` : `UNMOUNT`), i.current = e
        }
    }, [e, l]), q(() => {
        if (t) {
            let e, n = t.ownerDocument.defaultView ?? window,
                a = vt(a => {
                    let o = wt(r.current).includes(CSS.escape(a.animationName));
                    if (a.target === t && o && (l(`ANIMATION_END`), !i.current)) {
                        let r = t.style.animationFillMode;
                        t.style.animationFillMode = `forwards`, e = n.setTimeout(() => {
                            t.style.animationFillMode === `forwards` && (t.style.animationFillMode = r)
                        })
                    }
                }, `handleAnimationEnd`),
                s = vt(e => {
                    e.target === t && (o.current = wt(r.current))
                }, `handleAnimationStart`);
            return t.addEventListener(`animationstart`, s), t.addEventListener(`animationcancel`, a), t.addEventListener(`animationend`, a), () => {
                n.clearTimeout(e), t.removeEventListener(`animationstart`, s), t.removeEventListener(`animationcancel`, a), t.removeEventListener(`animationend`, a)
            }
        } else l(`ANIMATION_END`)
    }, [t, l]), {
        isPresent: [`mounted`, `unmountSuspended`].includes(c),
        ref: a.useCallback(e => {
            if (e) {
                let t = getComputedStyle(e);
                r.current = t, s.current = wt(t)
            } else r.current = null;
            n(e)
        }, [])
    }
}
vt(xt, `usePresence`);

function St(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
vt(St, `setRef`);

function Ct(...e) {
    let t = a.useRef(e);
    return t.current = e, a.useCallback(e => {
        let n = t.current,
            r = !1,
            i = n.map(t => {
                let n = St(t, e);
                return !r && typeof n == `function` && (r = !0), n
            });
        if (r) return () => {
            for (let e = 0; e < i.length; e++) {
                let t = i[e];
                typeof t == `function` ? t() : St(n[e], null)
            }
        }
    }, [])
}
vt(Ct, `useStableComposedRefs`);

function wt(e) {
    return e?.animationName || `none`
}
vt(wt, `getAnimationName`);

function Tt(e) {
    let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
        n = t && `isReactWarning` in t && t.isReactWarning;
    return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, `ref`)?.get, n = t && `isReactWarning` in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref)
}
vt(Tt, `getElementRef`);
var Et = Object.defineProperty,
    Dt = (e, t) => Et(e, `name`, {
        value: t,
        configurable: !0
    }),
    Ot = a.useId || (() => void 0),
    kt = 0;

function At(e) {
    let [t, n] = a.useState(Ot());
    return q(() => {
        e || n(e => e ?? String(kt++))
    }, [e]), e || (t ? `radix-${t}` : ``)
}
Dt(At, `useId`);
var jt = Object.defineProperty,
    Mt = (e, t) => jt(e, `name`, {
        value: t,
        configurable: !0
    }),
    Nt = a.createContext(void 0);

function Pt(e) {
    let t = a.useContext(Nt);
    return e || t || `ltr`
}
Mt(Pt, `useDirection`);
var Ft = Object.defineProperty,
    It = (e, t) => Ft(e, `name`, {
        value: t,
        configurable: !0
    });

function Lt(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
It(Lt, `setRef`);

function Rt(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = Lt(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : Lt(e[t], null)
            }
        }
    }
}
It(Rt, `composeRefs`);

function zt(...e) {
    return a.useCallback(Rt(...e), e)
}
It(zt, `useComposedRefs`);
var Bt = Object.defineProperty,
    Vt = (e, t) => Bt(e, `name`, {
        value: t,
        configurable: !0
    });

function Ht(e) {
    let t = a.useRef(e);
    return a.useEffect(() => {
        t.current = e
    }), a.useMemo(() => ((...e) => t.current?.(...e)), [])
}
Vt(Ht, `useCallbackRef`);
var Ut = Object.defineProperty,
    J = (e, t) => Ut(e, `name`, {
        value: t,
        configurable: !0
    }),
    Wt = `dismissableLayer.update`,
    Gt = `dismissableLayer.pointerDownOutside`,
    Kt = `dismissableLayer.focusOutside`,
    qt, Jt = a.createContext({
        layers: new Set,
        layersWithOutsidePointerEventsDisabled: new Set,
        branches: new Set,
        dismissableSurfaces: new Set
    }),
    Yt = a.forwardRef(J(function(e, t) {
        let {
            disableOutsidePointerEvents: n = !1,
            deferPointerDownOutside: r = !1,
            onEscapeKeyDown: i,
            onPointerDownOutside: o,
            onFocusOutside: s,
            onInteractOutside: c,
            onDismiss: l,
            ...u
        } = e, d = a.useContext(Jt), [f, p] = a.useState(null), m = f?.ownerDocument ?? globalThis?.document, [, h] = a.useState({}), g = zt(t, p), _ = Array.from(d.layers), [v] = [...d.layersWithOutsidePointerEventsDisabled].slice(-1), y = v ? _.indexOf(v) : -1, b = f ? _.indexOf(f) : -1, x = d.layersWithOutsidePointerEventsDisabled.size > 0, S = b >= y, C = a.useRef(!1), w = Qt(e => {
            o?.(e), c?.(e), e.defaultPrevented || l?.()
        }, {
            ownerDocument: m,
            deferPointerDownOutside: r,
            isDeferredPointerDownOutsideRef: C,
            dismissableSurfaces: d.dismissableSurfaces,
            shouldHandlePointerDownOutside: a.useCallback(e => {
                if (!(e instanceof Node)) return !1;
                let t = [...d.branches].some(t => t.contains(e));
                return S && !t
            }, [d.branches, S])
        }), T = $t(e => {
            if (r && C.current) return;
            let t = e.target;
            [...d.branches].some(e => e.contains(t)) || (s?.(e), c?.(e), e.defaultPrevented || l?.())
        }, m), E = f ? b === _.length - 1 : !1, D = Ht(e => {
            e.key === `Escape` && (i?.(e), !e.defaultPrevented && l && (e.preventDefault(), l()))
        });
        return a.useEffect(() => {
            if (E) return m.addEventListener(`keydown`, D, {
                capture: !0
            }), () => m.removeEventListener(`keydown`, D, {
                capture: !0
            })
        }, [m, E, D]), a.useEffect(() => {
            if (f) return n && (d.layersWithOutsidePointerEventsDisabled.size === 0 && (qt = m.body.style.pointerEvents, m.body.style.pointerEvents = `none`), d.layersWithOutsidePointerEventsDisabled.add(f)), d.layers.add(f), en(), () => {
                n && (d.layersWithOutsidePointerEventsDisabled.delete(f), d.layersWithOutsidePointerEventsDisabled.size === 0 && (m.body.style.pointerEvents = qt))
            }
        }, [f, m, n, d]), a.useEffect(() => () => {
            f && (d.layers.delete(f), d.layersWithOutsidePointerEventsDisabled.delete(f), en())
        }, [f, d]), a.useEffect(() => {
            let e = J(() => h({}), `handleUpdate`);
            return document.addEventListener(Wt, e), () => document.removeEventListener(Wt, e)
        }, []), (0, V.jsx)(H.div, {
            ...u,
            ref: g,
            style: {
                pointerEvents: x ? S ? `auto` : `none` : void 0,
                ...e.style
            },
            onFocusCapture: K(e.onFocusCapture, T.onFocusCapture),
            onBlurCapture: K(e.onBlurCapture, T.onBlurCapture),
            onPointerDownCapture: K(e.onPointerDownCapture, w.onPointerDownCapture)
        })
    }, `DismissableLayer`));

function Xt() {
    let e = a.useContext(Jt),
        [t, n] = a.useState(null);
    return a.useEffect(() => {
        if (t) return e.dismissableSurfaces.add(t), () => {
            e.dismissableSurfaces.delete(t)
        }
    }, [t, e.dismissableSurfaces]), n
}
J(Xt, `useDismissableLayerSurface`);
var Zt = J(() => !0, `IS_TRUE`);

function Qt(e, t) {
    let {
        ownerDocument: n = globalThis?.document,
        deferPointerDownOutside: r = !1,
        isDeferredPointerDownOutsideRef: i,
        dismissableSurfaces: o,
        shouldHandlePointerDownOutside: s = Zt
    } = t, c = Ht(e), l = a.useRef(!1), u = a.useRef(!1), d = a.useRef(new Map), f = a.useRef(() => {});
    return a.useEffect(() => {
        function e() {
            u.current = !1, i.current = !1, d.current.clear()
        }
        J(e, `resetOutsideInteraction`);

        function t() {
            return Array.from(d.current.values()).some(Boolean)
        }
        J(t, `isOutsideInteractionIntercepted`);

        function a(e) {
            if (!u.current) return;
            let t = e.target;
            t instanceof Node && [...o].some(e => e.contains(t)) || d.current.set(e.type, !0), e.type === `click` && window.setTimeout(() => {
                u.current && f.current()
            }, 0)
        }
        J(a, `handleInteractionCapture`);

        function p(e) {
            u.current && d.current.set(e.type, !1)
        }
        J(p, `handleInteractionBubble`);
        let m = J(a => {
                if (a.target && !l.current) {
                    let o = function() {
                        n.removeEventListener(`click`, f.current);
                        let r = t();
                        e(), r || tn(Gt, c, p, {
                            discrete: !0
                        })
                    };
                    if (J(o, `handleAndDispatchPointerDownOutsideEvent`), !s(a.target)) {
                        n.removeEventListener(`click`, f.current), e(), l.current = !1;
                        return
                    }
                    let p = {
                        originalEvent: a
                    };
                    u.current = !0, i.current = r && a.button === 0, d.current.clear(), !r || a.button !== 0 ? o() : (n.removeEventListener(`click`, f.current), f.current = o, n.addEventListener(`click`, f.current, {
                        once: !0
                    }))
                } else n.removeEventListener(`click`, f.current), e();
                l.current = !1
            }, `handlePointerDown`),
            h = [`pointerup`, `mousedown`, `mouseup`, `touchstart`, `touchend`, `click`];
        for (let e of h) n.addEventListener(e, a, !0), n.addEventListener(e, p);
        let g = window.setTimeout(() => {
            n.addEventListener(`pointerdown`, m)
        }, 0);
        return () => {
            window.clearTimeout(g), n.removeEventListener(`pointerdown`, m), n.removeEventListener(`click`, f.current);
            for (let e of h) n.removeEventListener(e, a, !0), n.removeEventListener(e, p)
        }
    }, [n, c, r, i, o, s]), {
        onPointerDownCapture: J(() => l.current = !0, `onPointerDownCapture`)
    }
}
J(Qt, `usePointerDownOutside`);

function $t(e, t = globalThis?.document) {
    let n = Ht(e),
        r = a.useRef(!1);
    return a.useEffect(() => {
        let e = J(e => {
            e.target && !r.current && tn(Kt, n, {
                originalEvent: e
            }, {
                discrete: !1
            })
        }, `handleFocus`);
        return t.addEventListener(`focusin`, e), () => t.removeEventListener(`focusin`, e)
    }, [t, n]), {
        onFocusCapture: J(() => r.current = !0, `onFocusCapture`),
        onBlurCapture: J(() => r.current = !1, `onBlurCapture`)
    }
}
J($t, `useFocusOutside`);

function en() {
    let e = new CustomEvent(Wt);
    document.dispatchEvent(e)
}
J(en, `dispatchUpdate`);

function tn(e, t, n, {
    discrete: r
}) {
    let i = n.originalEvent.target,
        a = new CustomEvent(e, {
            bubbles: !1,
            cancelable: !0,
            detail: n
        });
    t && i.addEventListener(e, t, {
        once: !0
    }), r ? me(i, a) : i.dispatchEvent(a)
}
J(tn, `handleAndDispatchCustomEvent`);
var nn = Object.defineProperty,
    rn = (e, t) => nn(e, `name`, {
        value: t,
        configurable: !0
    });

function an(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
rn(an, `setRef`);

function on(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = an(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : an(e[t], null)
            }
        }
    }
}
rn(on, `composeRefs`);

function sn(...e) {
    return a.useCallback(on(...e), e)
}
rn(sn, `useComposedRefs`);
var cn = Object.defineProperty,
    ln = (e, t) => cn(e, `name`, {
        value: t,
        configurable: !0
    }),
    un = `focusScope.autoFocusOnMount`,
    dn = `focusScope.autoFocusOnUnmount`,
    fn = {
        bubbles: !1,
        cancelable: !0
    },
    pn = a.forwardRef(ln(function(e, t) {
        let {
            loop: n = !1,
            trapped: r = !1,
            onMountAutoFocus: i,
            onUnmountAutoFocus: o,
            ...s
        } = e, [c, l] = a.useState(null), u = Ht(i), d = Ht(o), f = a.useRef(null), p = sn(t, l), m = a.useRef({
            paused: !1,
            pause() {
                this.paused = !0
            },
            resume() {
                this.paused = !1
            }
        }).current;
        a.useEffect(() => {
            if (r) {
                let e = function(e) {
                        if (m.paused || !c) return;
                        let t = e.target;
                        c.contains(t) ? f.current = t : bn(f.current, {
                            select: !0
                        })
                    },
                    t = function(e) {
                        if (m.paused || !c) return;
                        let t = e.relatedTarget;
                        t !== null && (c.contains(t) || bn(f.current, {
                            select: !0
                        }))
                    },
                    n = function(e) {
                        if (document.activeElement === document.body)
                            for (let t of e) t.removedNodes.length > 0 && bn(c)
                    };
                ln(e, `handleFocusIn`), ln(t, `handleFocusOut`), ln(n, `handleMutations`), document.addEventListener(`focusin`, e), document.addEventListener(`focusout`, t);
                let r = new MutationObserver(n);
                return c && r.observe(c, {
                    childList: !0,
                    subtree: !0
                }), () => {
                    document.removeEventListener(`focusin`, e), document.removeEventListener(`focusout`, t), r.disconnect()
                }
            }
        }, [r, c, m.paused]), a.useEffect(() => {
            if (c) {
                xn.add(m);
                let e = document.activeElement;
                if (!c.contains(e)) {
                    let t = new CustomEvent(un, fn);
                    c.addEventListener(un, u), c.dispatchEvent(t), t.defaultPrevented || (mn(wn(gn(c)), {
                        select: !0
                    }), document.activeElement === e && bn(c))
                }
                return () => {
                    c.removeEventListener(un, u), setTimeout(() => {
                        let t = new CustomEvent(dn, fn);
                        c.addEventListener(dn, d), c.dispatchEvent(t), t.defaultPrevented || bn(e ?? document.body, {
                            select: !0
                        }), c.removeEventListener(dn, d), xn.remove(m)
                    }, 0)
                }
            }
        }, [c, u, d, m]);
        let h = a.useCallback(e => {
            if (!n && !r || m.paused) return;
            let t = e.key === `Tab` && !e.altKey && !e.ctrlKey && !e.metaKey,
                i = document.activeElement;
            if (t && i) {
                let t = e.currentTarget,
                    [r, a] = hn(t);
                r && a ? !e.shiftKey && i === a ? (e.preventDefault(), n && bn(r, {
                    select: !0
                })) : e.shiftKey && i === r && (e.preventDefault(), n && bn(a, {
                    select: !0
                })) : i === t && e.preventDefault()
            }
        }, [n, r, m.paused]);
        return (0, V.jsx)(H.div, {
            tabIndex: -1,
            ...s,
            ref: p,
            onKeyDown: h
        })
    }, `FocusScope`));

function mn(e, {
    select: t = !1
} = {}) {
    let n = document.activeElement;
    for (let r of e)
        if (bn(r, {
                select: t
            }), document.activeElement !== n) return
}
ln(mn, `focusFirst`);

function hn(e) {
    let t = gn(e);
    return [_n(t, e), _n(t.reverse(), e)]
}
ln(hn, `getTabbableEdges`);

function gn(e) {
    let t = [],
        n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
            acceptNode: ln(e => {
                let t = e.tagName === `INPUT` && e.type === `hidden`;
                return e.disabled || e.hidden || t ? NodeFilter.FILTER_SKIP : e.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            }, `acceptNode`)
        });
    for (; n.nextNode();) t.push(n.currentNode);
    return t
}
ln(gn, `getTabbableCandidates`);

function _n(e, t) {
    let n = typeof t.checkVisibility == `function` && t.checkVisibility({
        checkVisibilityCSS: !0
    });
    for (let r of e)
        if (!(n ? !r.checkVisibility({
                checkVisibilityCSS: !0
            }) : vn(r, {
                upTo: t
            }))) return r
}
ln(_n, `findVisible`);

function vn(e, {
    upTo: t
}) {
    if (getComputedStyle(e).visibility === `hidden`) return !0;
    for (; e;) {
        if (t !== void 0 && e === t) return !1;
        if (getComputedStyle(e).display === `none`) return !0;
        e = e.parentElement
    }
    return !1
}
ln(vn, `isHidden`);

function yn(e) {
    return e instanceof HTMLInputElement && `select` in e
}
ln(yn, `isSelectableInput`);

function bn(e, {
    select: t = !1
} = {}) {
    if (e && e.focus) {
        let n = document.activeElement;
        e.focus({
            preventScroll: !0
        }), e !== n && yn(e) && t && e.select()
    }
}
ln(bn, `focus`);
var xn = Sn();

function Sn() {
    let e = [];
    return {
        add(t) {
            let n = e[0];
            t !== n && n?.pause(), e = Cn(e, t), e.unshift(t)
        },
        remove(t) {
            e = Cn(e, t), e[0]?.resume()
        }
    }
}
ln(Sn, `createFocusScopesStack`);

function Cn(e, t) {
    let n = [...e],
        r = n.indexOf(t);
    return r !== -1 && n.splice(r, 1), n
}
ln(Cn, `arrayRemove`);

function wn(e) {
    return e.filter(e => e.tagName !== `A`)
}
ln(wn, `removeLinks`);
var Tn = Object.defineProperty,
    En = a.forwardRef(((e, t) => Tn(e, `name`, {
        value: t,
        configurable: !0
    }))(function(e, t) {
        let {
            container: n,
            ...r
        } = e, [i, o] = a.useState(!1);
        q(() => o(!0), []);
        let s = n || i && globalThis?.document?.body;
        return s ? de.createPortal((0, V.jsx)(H.div, {
            ...r,
            ref: t
        }), s) : null
    }, `Portal`)),
    Dn = Object.defineProperty,
    On = (e, t) => Dn(e, `name`, {
        value: t,
        configurable: !0
    }),
    kn = 0,
    An = null;

function jn(e) {
    return Mn(), e.children
}
On(jn, `FocusGuards`);

function Mn() {
    a.useEffect(() => {
        An ||= {
            start: Nn(),
            end: Nn()
        };
        let {
            start: e,
            end: t
        } = An;
        return document.body.firstElementChild !== e && document.body.insertAdjacentElement(`afterbegin`, e), document.body.lastElementChild !== t && document.body.insertAdjacentElement(`beforeend`, t), kn++, () => {
            kn === 1 && (An?.start.remove(), An?.end.remove(), An = null), kn = Math.max(0, kn - 1)
        }
    }, [])
}
On(Mn, `useFocusGuards`);

function Nn() {
    let e = document.createElement(`span`);
    return e.setAttribute(`data-radix-focus-guard`, ``), e.tabIndex = 0, e.style.outline = `none`, e.style.opacity = `0`, e.style.position = `fixed`, e.style.pointerEvents = `none`, e
}
On(Nn, `createFocusGuard`);
var Pn = function() {
    return Pn = Object.assign || function(e) {
        for (var t, n = 1, r = arguments.length; n < r; n++)
            for (var i in t = arguments[n], t) Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
        return e
    }, Pn.apply(this, arguments)
};

function Fn(e, t) {
    var n = {};
    for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
    if (e != null && typeof Object.getOwnPropertySymbols == `function`)
        for (var i = 0, r = Object.getOwnPropertySymbols(e); i < r.length; i++) t.indexOf(r[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[i]) && (n[r[i]] = e[r[i]]);
    return n
}

function In(e, t, n) {
    if (n || arguments.length === 2)
        for (var r = 0, i = t.length, a; r < i; r++)(a || !(r in t)) && (a ||= Array.prototype.slice.call(t, 0, r), a[r] = t[r]);
    return e.concat(a || Array.prototype.slice.call(t))
}
var Ln = `right-scroll-bar-position`,
    Rn = `width-before-scroll-bar`,
    zn = `with-scroll-bars-hidden`,
    Bn = `--removed-body-scroll-bar-size`;

function Vn(e, t) {
    return typeof e == `function` ? e(t) : e && (e.current = t), e
}

function Hn(e, t) {
    var n = (0, a.useState)(function() {
        return {
            value: e,
            callback: t,
            facade: {
                get current() {
                    return n.value
                },
                set current(e) {
                    var t = n.value;
                    t !== e && (n.value = e, n.callback(e, t))
                }
            }
        }
    })[0];
    return n.callback = t, n.facade
}
var Un = a.useLayoutEffect,
    Wn = new WeakMap;

function Gn(e, t) {
    var n = Hn(t || null, function(t) {
        return e.forEach(function(e) {
            return Vn(e, t)
        })
    });
    return Un(function() {
        var t = Wn.get(n);
        if (t) {
            var r = new Set(t),
                i = new Set(e),
                a = n.current;
            r.forEach(function(e) {
                i.has(e) || Vn(e, null)
            }), i.forEach(function(e) {
                r.has(e) || Vn(e, a)
            })
        }
        Wn.set(n, e)
    }, [e]), n
}

function Kn(e) {
    return e
}

function qn(e, t) {
    t === void 0 && (t = Kn);
    var n = [],
        r = !1;
    return {
        read: function() {
            if (r) throw Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
            return n.length ? n[n.length - 1] : e
        },
        useMedium: function(e) {
            var i = t(e, r);
            return n.push(i),
                function() {
                    n = n.filter(function(e) {
                        return e !== i
                    })
                }
        },
        assignSyncMedium: function(e) {
            for (r = !0; n.length;) {
                var t = n;
                n = [], t.forEach(e)
            }
            n = {
                push: function(t) {
                    return e(t)
                },
                filter: function() {
                    return n
                }
            }
        },
        assignMedium: function(e) {
            r = !0;
            var t = [];
            if (n.length) {
                var i = n;
                n = [], i.forEach(e), t = n
            }
            var a = function() {
                    var n = t;
                    t = [], n.forEach(e)
                },
                o = function() {
                    return Promise.resolve().then(a)
                };
            o(), n = {
                push: function(e) {
                    t.push(e), o()
                },
                filter: function(e) {
                    return t = t.filter(e), n
                }
            }
        }
    }
}

function Jn(e) {
    e === void 0 && (e = {});
    var t = qn(null);
    return t.options = Pn({
        async: !0,
        ssr: !1
    }, e), t
}
var Yn = function(e) {
    var t = e.sideCar,
        n = Fn(e, [`sideCar`]);
    if (!t) throw Error("Sidecar: please provide `sideCar` property to import the right car");
    var r = t.read();
    if (!r) throw Error(`Sidecar medium not found`);
    return a.createElement(r, Pn({}, n))
};
Yn.isSideCarExport = !0;

function Xn(e, t) {
    return e.useMedium(t), Yn
}
var Zn = Jn(),
    Qn = function() {},
    $n = a.forwardRef(function(e, t) {
        var n = a.useRef(null),
            r = a.useState({
                onScrollCapture: Qn,
                onWheelCapture: Qn,
                onTouchMoveCapture: Qn
            }),
            i = r[0],
            o = r[1],
            s = e.forwardProps,
            c = e.children,
            l = e.className,
            u = e.removeScrollBar,
            d = e.enabled,
            f = e.shards,
            p = e.sideCar,
            m = e.noRelative,
            h = e.noIsolation,
            g = e.inert,
            _ = e.allowPinchZoom,
            v = e.as,
            y = v === void 0 ? `div` : v,
            b = e.gapMode,
            x = Fn(e, [`forwardProps`, `children`, `className`, `removeScrollBar`, `enabled`, `shards`, `sideCar`, `noRelative`, `noIsolation`, `inert`, `allowPinchZoom`, `as`, `gapMode`]),
            S = p,
            C = Gn([n, t]),
            w = Pn(Pn({}, x), i);
        return a.createElement(a.Fragment, null, d && a.createElement(S, {
            sideCar: Zn,
            removeScrollBar: u,
            shards: f,
            noRelative: m,
            noIsolation: h,
            inert: g,
            setCallbacks: o,
            allowPinchZoom: !!_,
            lockRef: n,
            gapMode: b
        }), s ? a.cloneElement(a.Children.only(c), Pn(Pn({}, w), {
            ref: C
        })) : a.createElement(y, Pn({}, w, {
            className: l,
            ref: C
        }), c))
    });
$n.defaultProps = {
    enabled: !0,
    removeScrollBar: !0,
    inert: !1
}, $n.classNames = {
    fullWidth: Rn,
    zeroRight: Ln
};
var er, tr = function() {
    if (er) return er;
    if (typeof __webpack_nonce__ < `u`) return __webpack_nonce__
};

function nr() {
    if (!document) return null;
    var e = document.createElement(`style`);
    e.type = `text/css`;
    var t = tr();
    return t && e.setAttribute(`nonce`, t), e
}

function rr(e, t) {
    e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t))
}

function ir(e) {
    (document.head || document.getElementsByTagName(`head`)[0]).appendChild(e)
}
var ar = function() {
        var e = 0,
            t = null;
        return {
            add: function(n) {
                e == 0 && (t = nr()) && (rr(t, n), ir(t)), e++
            },
            remove: function() {
                e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null)
            }
        }
    },
    or = function() {
        var e = ar();
        return function(t, n) {
            a.useEffect(function() {
                return e.add(t),
                    function() {
                        e.remove()
                    }
            }, [t && n])
        }
    },
    sr = function() {
        var e = or();
        return function(t) {
            var n = t.styles,
                r = t.dynamic;
            return e(n, r), null
        }
    },
    cr = function(e) {
        return parseInt(e || ``, 10) || 0
    },
    lr = function(e) {
        var t = window.getComputedStyle(document.body),
            n = t[e === `padding` ? `paddingLeft` : `marginLeft`],
            r = t[e === `padding` ? `paddingTop` : `marginTop`],
            i = t[e === `padding` ? `paddingRight` : `marginRight`];
        return [cr(n), cr(r), cr(i)]
    },
    ur = function(e) {
        e === void 0 && (e = `margin`);
        var t = lr(e),
            n = document.documentElement.clientWidth,
            r = window.innerWidth;
        return {
            left: t[0],
            top: t[1],
            right: t[2],
            gap: Math.max(0, r - n + t[2] - t[0])
        }
    },
    dr = sr(),
    fr = `data-scroll-locked`,
    pr = function(e, t, n, r) {
        var i = e.left,
            a = e.top,
            o = e.right,
            s = e.gap;
        return n === void 0 && (n = `margin`), `
  .${zn} {
   overflow: hidden ${r};
   padding-right: ${s}px ${r};
  }
  body[${fr}] {
    overflow: hidden ${r};
    overscroll-behavior: contain;
    ${[t&&`position: relative ${r};`,n===`margin`&&`
    padding-left: ${i}px;
    padding-top: ${a}px;
    padding-right: ${o}px;
    margin-left:0;
    margin-top:0;
    margin-right: ${s}px ${r};
    `,n===`padding`&&`padding-right: ${s}px ${r};`].filter(Boolean).join(``)}
  }
  
  .${Ln} {
    right: ${s}px ${r};
  }
  
  .${Rn} {
    margin-right: ${s}px ${r};
  }
  
  .${Ln} .${Ln} {
    right: 0 ${r};
  }
  
  .${Rn} .${Rn} {
    margin-right: 0 ${r};
  }
  
  body[${fr}] {
    ${Bn}: ${s}px;
  }
`
    },
    mr = function() {
        var e = parseInt(document.body.getAttribute(`data-scroll-locked`) || `0`, 10);
        return isFinite(e) ? e : 0
    },
    hr = function() {
        a.useEffect(function() {
            return document.body.setAttribute(fr, (mr() + 1).toString()),
                function() {
                    var e = mr() - 1;
                    e <= 0 ? document.body.removeAttribute(fr) : document.body.setAttribute(fr, e.toString())
                }
        }, [])
    },
    gr = function(e) {
        var t = e.noRelative,
            n = e.noImportant,
            r = e.gapMode,
            i = r === void 0 ? `margin` : r;
        hr();
        var o = a.useMemo(function() {
            return ur(i)
        }, [i]);
        return a.createElement(dr, {
            styles: pr(o, !t, i, n ? `` : `!important`)
        })
    },
    _r = !1;
try {
    var vr = Object.defineProperty({}, `passive`, {
        get: function() {
            return _r = !0, !0
        }
    });
    window.addEventListener(`test`, vr, vr), window.removeEventListener(`test`, vr, vr)
} catch {
    _r = !1
}
var yr = _r ? {
        passive: !1
    } : !1,
    br = function(e) {
        return e.tagName === `TEXTAREA`
    },
    xr = function(e, t) {
        if (!(e instanceof Element)) return !1;
        var n = window.getComputedStyle(e);
        return n[t] !== `hidden` && !(n.overflowY === n.overflowX && !br(e) && n[t] === `visible`)
    },
    Sr = function(e) {
        return xr(e, `overflowY`)
    },
    Cr = function(e) {
        return xr(e, `overflowX`)
    },
    wr = function(e, t) {
        var n = t.ownerDocument,
            r = t;
        do {
            if (typeof ShadowRoot < `u` && r instanceof ShadowRoot && (r = r.host), Dr(e, r)) {
                var i = Or(e, r);
                if (i[1] > i[2]) return !0
            }
            r = r.parentNode
        } while (r && r !== n.body);
        return !1
    },
    Tr = function(e) {
        return [e.scrollTop, e.scrollHeight, e.clientHeight]
    },
    Er = function(e) {
        return [e.scrollLeft, e.scrollWidth, e.clientWidth]
    },
    Dr = function(e, t) {
        return e === `v` ? Sr(t) : Cr(t)
    },
    Or = function(e, t) {
        return e === `v` ? Tr(t) : Er(t)
    },
    kr = function(e, t) {
        return e === `h` && t === `rtl` ? -1 : 1
    },
    Ar = function(e, t, n, r, i) {
        var a = kr(e, window.getComputedStyle(t).direction),
            o = a * r,
            s = n.target,
            c = t.contains(s),
            l = !1,
            u = o > 0,
            d = 0,
            f = 0;
        do {
            if (!s) break;
            var p = Or(e, s),
                m = p[0],
                h = p[1] - p[2] - a * m;
            (m || h) && Dr(e, s) && (d += h, f += m);
            var g = s.parentNode;
            s = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g
        } while (!c && s !== document.body || c && (t.contains(s) || t === s));
        return (u && (i && Math.abs(d) < 1 || !i && o > d) || !u && (i && Math.abs(f) < 1 || !i && -o > f)) && (l = !0), l
    },
    jr = function(e) {
        return `changedTouches` in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0]
    },
    Mr = function(e) {
        return [e.deltaX, e.deltaY]
    },
    Nr = function(e) {
        return e && `current` in e ? e.current : e
    },
    Pr = function(e, t) {
        return e[0] === t[0] && e[1] === t[1]
    },
    Fr = function(e) {
        return `
  .block-interactivity-${e} {pointer-events: none;}
  .allow-interactivity-${e} {pointer-events: all;}
`
    },
    Ir = 0,
    Lr = [];

function Rr(e) {
    var t = a.useRef([]),
        n = a.useRef([0, 0]),
        r = a.useRef(),
        i = a.useState(Ir++)[0],
        o = a.useState(sr)[0],
        s = a.useRef(e);
    a.useEffect(function() {
        s.current = e
    }, [e]), a.useEffect(function() {
        if (e.inert) {
            document.body.classList.add(`block-interactivity-${i}`);
            var t = In([e.lockRef.current], (e.shards || []).map(Nr), !0).filter(Boolean);
            return t.forEach(function(e) {
                    return e.classList.add(`allow-interactivity-${i}`)
                }),
                function() {
                    document.body.classList.remove(`block-interactivity-${i}`), t.forEach(function(e) {
                        return e.classList.remove(`allow-interactivity-${i}`)
                    })
                }
        }
    }, [e.inert, e.lockRef.current, e.shards]);
    var c = a.useCallback(function(e, t) {
            if (`touches` in e && e.touches.length === 2 || e.type === `wheel` && e.ctrlKey) return !s.current.allowPinchZoom;
            var i = jr(e),
                a = n.current,
                o = `deltaX` in e ? e.deltaX : a[0] - i[0],
                c = `deltaY` in e ? e.deltaY : a[1] - i[1],
                l, u = e.target,
                d = Math.abs(o) > Math.abs(c) ? `h` : `v`;
            if (`touches` in e && d === `h` && u.type === `range`) return !1;
            var f = window.getSelection(),
                p = f && f.anchorNode;
            if (p && (p === u || p.contains(u))) return !1;
            var m = wr(d, u);
            if (!m) return !0;
            if (m ? l = d : (l = d === `v` ? `h` : `v`, m = wr(d, u)), !m) return !1;
            if (!r.current && `changedTouches` in e && (o || c) && (r.current = l), !l) return !0;
            var h = r.current || l;
            return Ar(h, t, e, h === `h` ? o : c, !0)
        }, []),
        l = a.useCallback(function(e) {
            var n = e;
            if (!(!Lr.length || Lr[Lr.length - 1] !== o)) {
                var r = `deltaY` in n ? Mr(n) : jr(n),
                    i = t.current.filter(function(e) {
                        return e.name === n.type && (e.target === n.target || n.target === e.shadowParent) && Pr(e.delta, r)
                    })[0];
                if (i && i.should) {
                    n.cancelable && n.preventDefault();
                    return
                }
                if (!i) {
                    var a = (s.current.shards || []).map(Nr).filter(Boolean).filter(function(e) {
                        return e.contains(n.target)
                    });
                    (a.length > 0 ? c(n, a[0]) : !s.current.noIsolation) && n.cancelable && n.preventDefault()
                }
            }
        }, []),
        u = a.useCallback(function(e, n, r, i) {
            var a = {
                name: e,
                delta: n,
                target: r,
                should: i,
                shadowParent: zr(r)
            };
            t.current.push(a), setTimeout(function() {
                t.current = t.current.filter(function(e) {
                    return e !== a
                })
            }, 1)
        }, []),
        d = a.useCallback(function(e) {
            n.current = jr(e), r.current = void 0
        }, []),
        f = a.useCallback(function(t) {
            u(t.type, Mr(t), t.target, c(t, e.lockRef.current))
        }, []),
        p = a.useCallback(function(t) {
            u(t.type, jr(t), t.target, c(t, e.lockRef.current))
        }, []);
    a.useEffect(function() {
        return Lr.push(o), e.setCallbacks({
                onScrollCapture: f,
                onWheelCapture: f,
                onTouchMoveCapture: p
            }), document.addEventListener(`wheel`, l, yr), document.addEventListener(`touchmove`, l, yr), document.addEventListener(`touchstart`, d, yr),
            function() {
                Lr = Lr.filter(function(e) {
                    return e !== o
                }), document.removeEventListener(`wheel`, l, yr), document.removeEventListener(`touchmove`, l, yr), document.removeEventListener(`touchstart`, d, yr)
            }
    }, []);
    var m = e.removeScrollBar,
        h = e.inert;
    return a.createElement(a.Fragment, null, h ? a.createElement(o, {
        styles: Fr(i)
    }) : null, m ? a.createElement(gr, {
        noRelative: e.noRelative,
        gapMode: e.gapMode
    }) : null)
}

function zr(e) {
    for (var t = null; e !== null;) e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
    return t
}
var Br = Xn(Zn, Rr),
    Vr = a.forwardRef(function(e, t) {
        return a.createElement($n, Pn({}, e, {
            ref: t,
            sideCar: Br
        }))
    });
Vr.classNames = $n.classNames;
var Hr = function(e) {
        return typeof document > `u` ? null : (Array.isArray(e) ? e[0] : e).ownerDocument.body
    },
    Ur = new WeakMap,
    Wr = new WeakMap,
    Gr = {},
    Kr = 0,
    qr = function(e) {
        return e && (e.host || qr(e.parentNode))
    },
    Jr = function(e, t) {
        return t.map(function(t) {
            if (e.contains(t)) return t;
            var n = qr(t);
            return n && e.contains(n) ? n : (console.error(`aria-hidden`, t, `in not contained inside`, e, `. Doing nothing`), null)
        }).filter(function(e) {
            return !!e
        })
    },
    Yr = function(e, t, n, r) {
        var i = Jr(t, Array.isArray(e) ? e : [e]);
        Gr[n] || (Gr[n] = new WeakMap);
        var a = Gr[n],
            o = [],
            s = new Set,
            c = new Set(i),
            l = function(e) {
                !e || s.has(e) || (s.add(e), l(e.parentNode))
            };
        i.forEach(l);
        var u = function(e) {
            !e || c.has(e) || Array.prototype.forEach.call(e.children, function(e) {
                if (s.has(e)) u(e);
                else try {
                    var t = e.getAttribute(r),
                        i = t !== null && t !== `false`,
                        c = (Ur.get(e) || 0) + 1,
                        l = (a.get(e) || 0) + 1;
                    Ur.set(e, c), a.set(e, l), o.push(e), c === 1 && i && Wr.set(e, !0), l === 1 && e.setAttribute(n, `true`), i || e.setAttribute(r, `true`)
                } catch (t) {
                    console.error(`aria-hidden: cannot operate on `, e, t)
                }
            })
        };
        return u(t), s.clear(), Kr++,
            function() {
                o.forEach(function(e) {
                    var t = Ur.get(e) - 1,
                        i = a.get(e) - 1;
                    Ur.set(e, t), a.set(e, i), t || (Wr.has(e) || e.removeAttribute(r), Wr.delete(e)), i || e.removeAttribute(n)
                }), Kr--, Kr || (Ur = new WeakMap, Ur = new WeakMap, Wr = new WeakMap, Gr = {})
            }
    },
    Xr = function(e, t, n) {
        n === void 0 && (n = `data-aria-hidden`);
        var r = Array.from(Array.isArray(e) ? e : [e]),
            i = t || Hr(e);
        return i ? (r.push.apply(r, Array.from(i.querySelectorAll(`[aria-live], script`))), Yr(r, i, n, `aria-hidden`)) : function() {
            return null
        }
    },
    Zr = Object.defineProperty,
    Qr = (e, t) => Zr(e, `name`, {
        value: t,
        configurable: !0
    });

function $r(e) {
    let [t, n] = a.useState(void 0);
    return q(() => {
        if (e) {
            n({
                width: e.offsetWidth,
                height: e.offsetHeight
            });
            let t = new ResizeObserver(t => {
                if (!Array.isArray(t) || !t.length) return;
                let r = t[0],
                    i, a;
                if (`borderBoxSize` in r) {
                    let e = r.borderBoxSize,
                        t = Array.isArray(e) ? e[0] : e;
                    i = t.inlineSize, a = t.blockSize
                } else i = e.offsetWidth, a = e.offsetHeight;
                n({
                    width: i,
                    height: a
                })
            });
            return t.observe(e, {
                box: `border-box`
            }), () => t.unobserve(e)
        } else n(void 0)
    }, [e]), t
}
Qr($r, `useSize`);
var ei = [`top`, `right`, `bottom`, `left`],
    ti = Math.min,
    ni = Math.max,
    ri = Math.round,
    ii = Math.floor,
    ai = e => ({
        x: e,
        y: e
    }),
    oi = {
        left: `right`,
        right: `left`,
        bottom: `top`,
        top: `bottom`
    };

function si(e, t, n) {
    return ni(e, ti(t, n))
}

function ci(e, t) {
    return typeof e == `function` ? e(t) : e
}

function li(e) {
    return e.split(`-`)[0]
}

function ui(e) {
    return e.split(`-`)[1]
}

function di(e) {
    return e === `x` ? `y` : `x`
}

function fi(e) {
    return e === `y` ? `height` : `width`
}

function pi(e) {
    let t = e[0];
    return t === `t` || t === `b` ? `y` : `x`
}

function mi(e) {
    return di(pi(e))
}

function hi(e, t, n) {
    n === void 0 && (n = !1);
    let r = ui(e),
        i = mi(e),
        a = fi(i),
        o = i === `x` ? r === (n ? `end` : `start`) ? `right` : `left` : r === `start` ? `bottom` : `top`;
    return t.reference[a] > t.floating[a] && (o = wi(o)), [o, wi(o)]
}

function gi(e) {
    let t = wi(e);
    return [_i(e), t, _i(t)]
}

function _i(e) {
    return e.includes(`start`) ? e.replace(`start`, `end`) : e.replace(`end`, `start`)
}
var vi = [`left`, `right`],
    yi = [`right`, `left`],
    bi = [`top`, `bottom`],
    xi = [`bottom`, `top`];

function Si(e, t, n) {
    switch (e) {
        case `top`:
        case `bottom`:
            return n ? t ? yi : vi : t ? vi : yi;
        case `left`:
        case `right`:
            return t ? bi : xi;
        default:
            return []
    }
}

function Ci(e, t, n, r) {
    let i = ui(e),
        a = Si(li(e), n === `start`, r);
    return i && (a = a.map(e => e + `-` + i), t && (a = a.concat(a.map(_i)))), a
}

function wi(e) {
    let t = li(e);
    return oi[t] + e.slice(t.length)
}

function Ti(e) {
    return {
        top: e.top ?? 0,
        right: e.right ?? 0,
        bottom: e.bottom ?? 0,
        left: e.left ?? 0
    }
}

function Ei(e) {
    return typeof e == `number` ? {
        top: e,
        right: e,
        bottom: e,
        left: e
    } : Ti(e)
}

function Di(e) {
    let {
        x: t,
        y: n,
        width: r,
        height: i
    } = e;
    return {
        width: r,
        height: i,
        top: n,
        left: t,
        right: t + r,
        bottom: n + i,
        x: t,
        y: n
    }
}

function Oi(e, t, n) {
    let {
        reference: r,
        floating: i
    } = e, a = pi(t), o = mi(t), s = fi(o), c = li(t), l = a === `y`, u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
    switch (c) {
        case `top`:
            p = {
                x: u,
                y: r.y - i.height
            };
            break;
        case `bottom`:
            p = {
                x: u,
                y: r.y + r.height
            };
            break;
        case `right`:
            p = {
                x: r.x + r.width,
                y: d
            };
            break;
        case `left`:
            p = {
                x: r.x - i.width,
                y: d
            };
            break;
        default:
            p = {
                x: r.x,
                y: r.y
            }
    }
    let m = ui(t);
    return m && (p[o] += f * (m === `end` ? 1 : -1) * (n && l ? -1 : 1)), p
}
async function ki(e, t) {
    t === void 0 && (t = {});
    let {
        x: n,
        y: r,
        platform: i,
        rects: a,
        elements: o,
        strategy: s
    } = e, {
        boundary: c = `clippingAncestors`,
        rootBoundary: l = `viewport`,
        elementContext: u = `floating`,
        altBoundary: d = !1,
        padding: f = 0
    } = ci(t, e), p = Ei(f), m = o[d ? u === `floating` ? `reference` : `floating` : u], h = Di(await i.getClippingRect({
        element: await (i.isElement == null ? void 0 : i.isElement(m)) ?? !0 ? m : m.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating)),
        boundary: c,
        rootBoundary: l,
        strategy: s
    })), g = u === `floating` ? {
        x: n,
        y: r,
        width: a.floating.width,
        height: a.floating.height
    } : a.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)), v = await (i.isElement == null ? void 0 : i.isElement(_)) && await (i.getScale == null ? void 0 : i.getScale(_)) || {
        x: 1,
        y: 1
    }, y = Di(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
        elements: o,
        rect: g,
        offsetParent: _,
        strategy: s
    }) : g);
    return {
        top: (h.top - y.top + p.top) / v.y,
        bottom: (y.bottom - h.bottom + p.bottom) / v.y,
        left: (h.left - y.left + p.left) / v.x,
        right: (y.right - h.right + p.right) / v.x
    }
}
var Ai = 50,
    ji = async (e, t, n) => {
        let {
            placement: r = `bottom`,
            strategy: i = `absolute`,
            middleware: a = [],
            platform: o
        } = n, s = o.detectOverflow ? o : {
            ...o,
            detectOverflow: ki
        }, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
            reference: e,
            floating: t,
            strategy: i
        }), {
            x: u,
            y: d
        } = Oi(l, r, c), f = r, p = 0, m = {};
        for (let n = 0; n < a.length; n++) {
            let h = a[n];
            if (!h) continue;
            let {
                name: g,
                fn: _
            } = h, {
                x: v,
                y,
                data: b,
                reset: x
            } = await _({
                x: u,
                y: d,
                initialPlacement: r,
                placement: f,
                strategy: i,
                middlewareData: m,
                rects: l,
                platform: s,
                elements: {
                    reference: e,
                    floating: t
                }
            });
            u = v ?? u, d = y ?? d, m[g] = {
                ...m[g],
                ...b
            }, x && p < Ai && (p++, typeof x == `object` && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
                reference: e,
                floating: t,
                strategy: i
            }) : x.rects), {
                x: u,
                y: d
            } = Oi(l, f, c)), n = -1)
        }
        return {
            x: u,
            y: d,
            placement: f,
            strategy: i,
            middlewareData: m
        }
    }, Mi = e => ({
        name: `arrow`,
        options: e,
        async fn(t) {
            let {
                x: n,
                y: r,
                placement: i,
                rects: a,
                platform: o,
                elements: s,
                middlewareData: c
            } = t, {
                element: l,
                padding: u = 0
            } = ci(e, t) || {};
            if (l == null) return {};
            let d = Ei(u),
                f = {
                    x: n,
                    y: r
                },
                p = mi(i),
                m = fi(p),
                h = await o.getDimensions(l),
                g = p === `y`,
                _ = g ? `top` : `left`,
                v = g ? `bottom` : `right`,
                y = g ? `clientHeight` : `clientWidth`,
                b = a.reference[m] + a.reference[p] - f[p] - a.floating[m],
                x = f[p] - a.reference[p],
                S = await (o.getOffsetParent == null ? void 0 : o.getOffsetParent(l)),
                C = S ? S[y] : 0;
            (!C || !await (o.isElement == null ? void 0 : o.isElement(S))) && (C = s.floating[y] || a.floating[m]);
            let w = b / 2 - x / 2,
                T = C / 2 - h[m] / 2 - 1,
                E = ti(d[_], T),
                D = ti(d[v], T),
                O = C - h[m] - D,
                k = C / 2 - h[m] / 2 + w,
                A = si(E, k, O),
                j = !c.arrow && ui(i) != null && k !== A && a.reference[m] / 2 - (k < E ? E : D) - h[m] / 2 < 0,
                M = j ? k < E ? k - E : k - O : 0;
            return {
                [p]: f[p] + M,
                data: {
                    [p]: A,
                    centerOffset: k - A - M,
                    ...j && {
                        alignmentOffset: M
                    }
                },
                reset: j
            }
        }
    }), Ni = function(e) {
        return e === void 0 && (e = {}), {
            name: `flip`,
            options: e,
            async fn(t) {
                var n;
                let {
                    placement: r,
                    middlewareData: i,
                    rects: a,
                    initialPlacement: o,
                    platform: s,
                    elements: c
                } = t, {
                    mainAxis: l = !0,
                    crossAxis: u = !0,
                    fallbackPlacements: d,
                    fallbackStrategy: f = `bestFit`,
                    fallbackAxisSideDirection: p = `none`,
                    flipAlignment: m = !0,
                    ...h
                } = ci(e, t);
                if ((n = i.arrow) != null && n.alignmentOffset) return {};
                let g = li(r),
                    _ = pi(o),
                    v = li(o) === o,
                    y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)),
                    b = d || (v || !m ? [wi(o)] : gi(o)),
                    x = p !== `none`;
                !d && x && b.push(...Ci(o, m, p, y));
                let S = [o, ...b],
                    C = await s.detectOverflow(t, h),
                    w = [],
                    T = i.flip?.overflows || [];
                if (l && w.push(C[g]), u) {
                    let e = hi(r, a, y);
                    w.push(C[e[0]], C[e[1]])
                }
                if (T = [...T, {
                        placement: r,
                        overflows: w
                    }], !w.every(e => e <= 0)) {
                    let e = (i.flip?.index || 0) + 1,
                        t = S[e];
                    if (t && (!(u === `alignment` && _ !== pi(t)) || T.every(e => pi(e.placement) === _ ? e.overflows[0] > 0 : !0))) return {
                        data: {
                            index: e,
                            overflows: T
                        },
                        reset: {
                            placement: t
                        }
                    };
                    let n = T.filter(e => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]?.placement;
                    if (!n) switch (f) {
                        case `bestFit`: {
                            let e = T.filter(e => {
                                if (x) {
                                    let t = pi(e.placement);
                                    return t === _ || t === `y`
                                }
                                return !0
                            }).map(e => [e.placement, e.overflows.filter(e => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]?.[0];
                            e && (n = e);
                            break
                        }
                        case `initialPlacement`:
                            n = o;
                            break
                    }
                    if (r !== n) return {
                        reset: {
                            placement: n
                        }
                    }
                }
                return {}
            }
        }
    };

function Pi(e, t) {
    return {
        top: e.top - t.height,
        right: e.right - t.width,
        bottom: e.bottom - t.height,
        left: e.left - t.width
    }
}

function Fi(e) {
    return ei.some(t => e[t] >= 0)
}
var Ii = function(e) {
        return e === void 0 && (e = {}), {
            name: `hide`,
            options: e,
            async fn(t) {
                let {
                    rects: n,
                    platform: r
                } = t, {
                    strategy: i = `referenceHidden`,
                    ...a
                } = ci(e, t);
                switch (i) {
                    case `referenceHidden`: {
                        let e = Pi(await r.detectOverflow(t, {
                            ...a,
                            elementContext: `reference`
                        }), n.reference);
                        return {
                            data: {
                                referenceHiddenOffsets: e,
                                referenceHidden: Fi(e)
                            }
                        }
                    }
                    case `escaped`: {
                        let e = Pi(await r.detectOverflow(t, {
                            ...a,
                            altBoundary: !0
                        }), n.floating);
                        return {
                            data: {
                                escapedOffsets: e,
                                escaped: Fi(e)
                            }
                        }
                    }
                    default:
                        return {}
                }
            }
        }
    },
    Li = new Set([`left`, `top`]);
async function Ri(e, t) {
    let {
        placement: n,
        platform: r,
        elements: i
    } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = li(n), s = ui(n), c = pi(n) === `y`, l = Li.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = ci(t, e), {
        mainAxis: f,
        crossAxis: p,
        alignmentAxis: m
    } = typeof d == `number` ? {
        mainAxis: d,
        crossAxis: 0,
        alignmentAxis: null
    } : {
        mainAxis: d.mainAxis || 0,
        crossAxis: d.crossAxis || 0,
        alignmentAxis: d.alignmentAxis
    };
    return s && typeof m == `number` && (p = s === `end` ? m * -1 : m), c ? {
        x: p * u,
        y: f * l
    } : {
        x: f * l,
        y: p * u
    }
}
var zi = function(e) {
        return e === void 0 && (e = 0), {
            name: `offset`,
            options: e,
            async fn(t) {
                var n;
                let {
                    x: r,
                    y: i,
                    placement: a,
                    middlewareData: o
                } = t, s = await Ri(t, e);
                return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset ? {} : {
                    x: r + s.x,
                    y: i + s.y,
                    data: {
                        ...s,
                        placement: a
                    }
                }
            }
        }
    },
    Bi = function(e) {
        return e === void 0 && (e = {}), {
            name: `shift`,
            options: e,
            async fn(t) {
                let {
                    x: n,
                    y: r,
                    placement: i,
                    platform: a
                } = t, {
                    mainAxis: o = !0,
                    crossAxis: s = !1,
                    limiter: c = {
                        fn: e => {
                            let {
                                x: t,
                                y: n
                            } = e;
                            return {
                                x: t,
                                y: n
                            }
                        }
                    },
                    ...l
                } = ci(e, t), u = {
                    x: n,
                    y: r
                }, d = await a.detectOverflow(t, l), f = pi(i), p = di(f), m = u[p], h = u[f], g = (e, t) => si(t + d[e === `y` ? `top` : `left`], t, t - d[e === `y` ? `bottom` : `right`]);
                o && (m = g(p, m)), s && (h = g(f, h));
                let _ = c.fn({
                    ...t,
                    [p]: m,
                    [f]: h
                });
                return {
                    ..._,
                    data: {
                        x: _.x - n,
                        y: _.y - r,
                        enabled: {
                            [p]: o,
                            [f]: s
                        }
                    }
                }
            }
        }
    },
    Vi = function(e) {
        return e === void 0 && (e = {}), {
            options: e,
            fn(t) {
                let {
                    x: n,
                    y: r,
                    placement: i,
                    rects: a,
                    middlewareData: o
                } = t, {
                    offset: s = 0,
                    mainAxis: c = !0,
                    crossAxis: l = !0
                } = ci(e, t), u = {
                    x: n,
                    y: r
                }, d = pi(i), f = di(d), p = u[f], m = u[d], h = ci(s, t), g = typeof h == `number` ? {
                    mainAxis: h,
                    crossAxis: 0
                } : {
                    mainAxis: h.mainAxis ?? 0,
                    crossAxis: h.crossAxis ?? 0
                };
                if (c) {
                    let e = f === `y` ? `height` : `width`,
                        t = a.reference[f] - a.floating[e] + g.mainAxis,
                        n = a.reference[f] + a.reference[e] - g.mainAxis;
                    p < t ? p = t : p > n && (p = n)
                }
                if (l) {
                    let e = f === `y` ? `width` : `height`,
                        t = Li.has(li(i)),
                        n = a.reference[d] - a.floating[e] + (t && o.offset?.[d] || 0) + (t ? 0 : g.crossAxis),
                        r = a.reference[d] + a.reference[e] + (t ? 0 : o.offset?.[d] || 0) - (t ? g.crossAxis : 0);
                    m < n ? m = n : m > r && (m = r)
                }
                return {
                    [f]: p,
                    [d]: m
                }
            }
        }
    },
    Hi = function(e) {
        return e === void 0 && (e = {}), {
            name: `size`,
            options: e,
            async fn(t) {
                let {
                    placement: n,
                    rects: r,
                    platform: i,
                    elements: a
                } = t, {
                    apply: o = () => {},
                    ...s
                } = ci(e, t), c = await i.detectOverflow(t, s), l = li(n), u = ui(n), d = pi(n) === `y`, {
                    width: f,
                    height: p
                } = r.floating, m, h;
                l === `top` || l === `bottom` ? (m = l, h = u === (await (i.isRTL == null ? void 0 : i.isRTL(a.floating)) ? `start` : `end`) ? `left` : `right`) : (h = l, m = u === `end` ? `top` : `bottom`);
                let g = p - c.top - c.bottom,
                    _ = f - c.left - c.right,
                    v = ti(p - c[m], g),
                    y = ti(f - c[h], _),
                    b = t.middlewareData.shift,
                    x = !b,
                    S = v,
                    C = y;
                b != null && b.enabled.x && (C = _), b != null && b.enabled.y && (S = g), x && !u && (d ? C = f - 2 * ni(c.left, c.right) : S = p - 2 * ni(c.top, c.bottom)), await o({
                    ...t,
                    availableWidth: C,
                    availableHeight: S
                });
                let w = await i.getDimensions(a.floating);
                return f !== w.width || p !== w.height ? {
                    reset: {
                        rects: !0
                    }
                } : {}
            }
        }
    };

function Ui() {
    return !0
}

function Wi(e) {
    return qi(e) ? (e.nodeName || ``).toLowerCase() : `#document`
}

function Gi(e) {
    var t;
    return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window
}

function Ki(e) {
    return ((qi(e) ? e.ownerDocument : e.document) || window.document)?.documentElement
}

function qi(e) {
    return Ui() ? e instanceof Node || e instanceof Gi(e).Node : !1
}

function Ji(e) {
    return Ui() ? e instanceof Element || e instanceof Gi(e).Element : !1
}

function Yi(e) {
    return Ui() ? e instanceof HTMLElement || e instanceof Gi(e).HTMLElement : !1
}

function Xi(e) {
    return !Ui() || typeof ShadowRoot > `u` ? !1 : e instanceof ShadowRoot || e instanceof Gi(e).ShadowRoot
}

function Zi(e) {
    let {
        overflow: t,
        overflowX: n,
        overflowY: r,
        display: i
    } = ca(e);
    return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== `inline` && i !== `contents`
}

function Qi(e) {
    return /^(table|td|th)$/.test(Wi(e))
}

function $i(e) {
    try {
        if (e.matches(`:popover-open`)) return !0
    } catch {}
    try {
        return e.matches(`:modal`)
    } catch {
        return !1
    }
}
var ea = /transform|translate|scale|rotate|perspective|filter/,
    ta = /paint|layout|strict|content/,
    na = e => !!e && e !== `none`,
    ra;

function ia(e) {
    let t = Ji(e) ? ca(e) : e;
    return na(t.transform) || na(t.translate) || na(t.scale) || na(t.rotate) || na(t.perspective) || !oa() && (na(t.backdropFilter) || na(t.filter)) || ea.test(t.willChange || ``) || ta.test(t.contain || ``)
}

function aa(e) {
    let t = ua(e);
    for (; Yi(t) && !sa(t);) {
        if (ia(t)) return t;
        if ($i(t)) return null;
        t = ua(t)
    }
    return null
}

function oa() {
    return ra ??= typeof CSS < `u` && CSS.supports && CSS.supports(`-webkit-backdrop-filter`, `none`), ra
}

function sa(e) {
    return /^(html|body|#document)$/.test(Wi(e))
}

function ca(e) {
    return Gi(e).getComputedStyle(e)
}

function la(e) {
    return Ji(e) ? {
        scrollLeft: e.scrollLeft,
        scrollTop: e.scrollTop
    } : {
        scrollLeft: e.scrollX,
        scrollTop: e.scrollY
    }
}

function ua(e) {
    if (Wi(e) === `html`) return e;
    let t = e.assignedSlot || e.parentNode || Xi(e) && e.host || Ki(e);
    return Xi(t) ? t.host : t
}

function da(e) {
    let t = ua(e);
    return sa(t) ? (e.ownerDocument || e).body : Yi(t) && Zi(t) ? t : da(t)
}

function fa(e, t, n) {
    t === void 0 && (t = []), n === void 0 && (n = !0);
    let r = da(e),
        i = r === e.ownerDocument?.body,
        a = Gi(r);
    if (i) {
        let e = pa(a);
        return t.concat(a, a.visualViewport || [], Zi(r) ? r : [], e && n ? fa(e) : [])
    } else return t.concat(r, fa(r, [], n))
}

function pa(e) {
    return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null
}

function ma(e) {
    let t = ca(e),
        n = parseFloat(t.width) || 0,
        r = parseFloat(t.height) || 0,
        i = Yi(e),
        a = i ? e.offsetWidth : n,
        o = i ? e.offsetHeight : r,
        s = ri(n) !== a || ri(r) !== o;
    return s && (n = a, r = o), {
        width: n,
        height: r,
        $: s
    }
}

function ha(e) {
    return Ji(e) ? e : e.contextElement
}

function ga(e) {
    let t = ha(e);
    if (!Yi(t)) return ai(1);
    let n = t.getBoundingClientRect(),
        {
            width: r,
            height: i,
            $: a
        } = ma(t),
        o = (a ? ri(n.width) : n.width) / r,
        s = (a ? ri(n.height) : n.height) / i;
    return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
        x: o,
        y: s
    }
}
var _a = ai(0);

function va(e) {
    let t = Gi(e);
    return !oa() || !t.visualViewport ? _a : {
        x: t.visualViewport.offsetLeft,
        y: t.visualViewport.offsetTop
    }
}

function ya(e, t, n) {
    return t === void 0 && (t = !1), !!n && t && n === Gi(e)
}

function ba(e, t, n, r) {
    t === void 0 && (t = !1), n === void 0 && (n = !1);
    let i = e.getBoundingClientRect(),
        a = ha(e),
        o = ai(1);
    t && (r ? Ji(r) && (o = ga(r)) : o = ga(e));
    let s = ya(a, n, r) ? va(a) : ai(0),
        c = (i.left + s.x) / o.x,
        l = (i.top + s.y) / o.y,
        u = i.width / o.x,
        d = i.height / o.y;
    if (a && r) {
        let e = Gi(a),
            t = Ji(r) ? Gi(r) : r,
            n = e,
            i = pa(n);
        for (; i && t !== n;) {
            let e = ga(i),
                t = i.getBoundingClientRect(),
                r = ca(i),
                a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x,
                o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
            c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = Gi(i), i = pa(n)
        }
    }
    return Di({
        width: u,
        height: d,
        x: c,
        y: l
    })
}

function xa(e, t) {
    let n = la(e).scrollLeft;
    return t ? t.left + n : ba(Ki(e)).left + n
}

function Sa(e, t) {
    let n = e.getBoundingClientRect();
    return {
        x: n.left + t.scrollLeft - xa(e, n),
        y: n.top + t.scrollTop
    }
}

function Ca(e) {
    let {
        elements: t,
        rect: n,
        offsetParent: r,
        strategy: i
    } = e, a = i === `fixed`, o = Ki(r), s = t ? $i(t.floating) : !1;
    if (r === o || s && a) return n;
    let c = {
            scrollLeft: 0,
            scrollTop: 0
        },
        l = ai(1),
        u = ai(0),
        d = Yi(r);
    if ((d || !a) && ((Wi(r) !== `body` || Zi(o)) && (c = la(r)), d)) {
        let e = ba(r);
        l = ga(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop
    }
    let f = o && !d && !a ? Sa(o, c) : ai(0);
    return {
        width: n.width * l.x,
        height: n.height * l.y,
        x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
        y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
    }
}

function wa(e) {
    return e.getClientRects ? Array.from(e.getClientRects()) : []
}

function Ta(e) {
    let t = la(e),
        n = e.ownerDocument.body,
        r = ni(e.scrollWidth, e.clientWidth, n.scrollWidth, n.clientWidth),
        i = ni(e.scrollHeight, e.clientHeight, n.scrollHeight, n.clientHeight),
        a = -t.scrollLeft + xa(e),
        o = -t.scrollTop;
    return ca(n).direction === `rtl` && (a += ni(e.clientWidth, n.clientWidth) - r), {
        width: r,
        height: i,
        x: a,
        y: o
    }
}
var Ea = 25;

function Da(e, t, n) {
    n === void 0 && (n = `viewport`);
    let r = n === `layoutViewport`,
        i = Gi(e),
        a = Ki(e),
        o = i.visualViewport,
        s = a.clientWidth,
        c = a.clientHeight,
        l = 0,
        u = 0;
    if (o) {
        let e = !oa() || t === `fixed`;
        r ? e || (l = -o.offsetLeft, u = -o.offsetTop) : (s = o.width, c = o.height, e && (l = o.offsetLeft, u = o.offsetTop))
    }
    if (xa(a) <= 0) {
        let e = a.ownerDocument,
            t = e.body,
            n = getComputedStyle(t),
            r = e.compatMode === `CSS1Compat` && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0,
            i = Math.abs(a.clientWidth - t.clientWidth - r),
            o = getComputedStyle(a).scrollbarGutter === `stable both-edges` ? i / 2 : i;
        o <= Ea && (s -= o)
    }
    return {
        width: s,
        height: c,
        x: l,
        y: u
    }
}

function Oa(e, t) {
    let n = ba(e, !0, t === `fixed`),
        r = n.top + e.clientTop,
        i = n.left + e.clientLeft,
        a = ga(e);
    return {
        width: e.clientWidth * a.x,
        height: e.clientHeight * a.y,
        x: i * a.x,
        y: r * a.y
    }
}

function ka(e, t, n) {
    let r;
    if (t === `viewport` || t === `layoutViewport`) r = Da(e, n, t);
    else if (t === `document`) r = Ta(Ki(e));
    else if (Ji(t)) r = Oa(t, n);
    else {
        let n = va(e);
        r = {
            x: t.x - n.x,
            y: t.y - n.y,
            width: t.width,
            height: t.height
        }
    }
    return Di(r)
}

function Aa(e, t) {
    let n = t.get(e);
    if (n) return n;
    let r = fa(e, [], !1).filter(e => Ji(e) && Wi(e) !== `body`),
        i = null,
        a = ca(e).position === `fixed`,
        o = a ? ua(e) : e;
    for (; Ji(o) && !sa(o);) {
        let e = ca(o),
            t = ia(o),
            n = i ? i.position : a ? `fixed` : ``;
        !t && (n === `fixed` || n === `absolute` && e.position === `static`) ? r = r.filter(e => e !== o) : i = e, o = ua(o)
    }
    return t.set(e, r), r
}

function ja(e) {
    let {
        element: t,
        boundary: n,
        rootBoundary: r,
        strategy: i
    } = e, a = [...n === `clippingAncestors` ? $i(t) ? [] : Aa(t, this._c) : [].concat(n), r], o = ka(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
    for (let e = 1; e < a.length; e++) {
        let n = ka(t, a[e], i);
        s = ni(n.top, s), c = ti(n.right, c), l = ti(n.bottom, l), u = ni(n.left, u)
    }
    return {
        width: c - u,
        height: l - s,
        x: u,
        y: s
    }
}

function Ma(e) {
    let {
        width: t,
        height: n
    } = ma(e);
    return {
        width: t,
        height: n
    }
}

function Na(e, t, n) {
    let r = Yi(t),
        i = Ki(t),
        a = n === `fixed`,
        o = ba(e, !0, a, t),
        s = {
            scrollLeft: 0,
            scrollTop: 0
        },
        c = ai(0);
    if ((r || !a) && ((Wi(t) !== `body` || Zi(i)) && (s = la(t)), r)) {
        let e = ba(t, !0, a, t);
        c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop
    }!r && i && (c.x = xa(i));
    let l = i && !r && !a ? Sa(i, s) : ai(0);
    return {
        x: o.left + s.scrollLeft - c.x - l.x,
        y: o.top + s.scrollTop - c.y - l.y,
        width: o.width,
        height: o.height
    }
}

function Pa(e) {
    return ca(e).position === `static`
}

function Fa(e, t) {
    if (!Yi(e) || ca(e).position === `fixed`) return null;
    if (t) return t(e);
    let n = e.offsetParent;
    return Ki(e) === n && (n = n.ownerDocument.body), n
}

function Ia(e, t) {
    let n = Gi(e);
    if ($i(e)) return n;
    if (!Yi(e)) {
        let t = ua(e);
        for (; t && !sa(t);) {
            if (Ji(t) && !Pa(t)) return t;
            t = ua(t)
        }
        return n
    }
    let r = Fa(e, t);
    for (; r && Qi(r) && Pa(r);) r = Fa(r, t);
    return r && sa(r) && Pa(r) && !ia(r) ? n : r || aa(e) || n
}
var La = async function(e) {
    let t = this.getOffsetParent || Ia,
        n = this.getDimensions,
        r = await n(e.floating);
    return {
        reference: Na(e.reference, await t(e.floating), e.strategy),
        floating: {
            x: 0,
            y: 0,
            width: r.width,
            height: r.height
        }
    }
};

function Ra(e) {
    return ca(e).direction === `rtl`
}
var za = {
    convertOffsetParentRelativeRectToViewportRelativeRect: Ca,
    getDocumentElement: Ki,
    getClippingRect: ja,
    getOffsetParent: Ia,
    getElementRects: La,
    getClientRects: wa,
    getDimensions: Ma,
    getScale: ga,
    isElement: Ji,
    isRTL: Ra
};

function Ba(e, t) {
    return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height
}

function Va(e, t, n) {
    let r = null,
        i, a = Ki(e);

    function o() {
        var e;
        clearTimeout(i), (e = r) == null || e.disconnect(), r = null
    }

    function s(n, c) {
        n === void 0 && (n = !1), c === void 0 && (c = 1), o();
        let l = e.getBoundingClientRect(),
            {
                left: u,
                top: d,
                width: f,
                height: p
            } = l;
        if (n || t(), !f || !p) return;
        let m = ii(d),
            h = ii(a.clientWidth - (u + f)),
            g = ii(a.clientHeight - (d + p)),
            _ = ii(u),
            v = {
                rootMargin: -m + `px ` + -h + `px ` + -g + `px ` + -_ + `px`,
                threshold: ni(0, ti(1, c)) || 1
            },
            y = !0;

        function b(t) {
            let n = t[0].intersectionRatio;
            if (!Ba(l, e.getBoundingClientRect())) return s();
            if (n !== c) {
                if (!y) return s();
                n ? s(!1, n) : i = setTimeout(() => {
                    s(!1, 1e-7)
                }, 1e3)
            }
            y = !1
        }
        try {
            r = new IntersectionObserver(b, {
                ...v,
                root: a.ownerDocument
            })
        } catch {
            r = new IntersectionObserver(b, v)
        }
        r.observe(e)
    }
    let c = Gi(e),
        l = () => s(n);
    return c.addEventListener(`resize`, l), s(!0), () => {
        c.removeEventListener(`resize`, l), o()
    }
}

function Ha(e, t, n, r) {
    r === void 0 && (r = {});
    let {
        ancestorScroll: i = !0,
        ancestorResize: a = !0,
        elementResize: o = typeof ResizeObserver == `function`,
        layoutShift: s = typeof IntersectionObserver == `function`,
        animationFrame: c = !1
    } = r, l = ha(e), u = i || a ? [...l ? fa(l) : [], ...t ? fa(t) : []] : [];
    u.forEach(e => {
        i && e.addEventListener(`scroll`, n), a && e.addEventListener(`resize`, n)
    });
    let d = l && s ? Va(l, n, a) : null,
        f = -1,
        p = null;
    o && (p = new ResizeObserver(e => {
        let [r] = e;
        r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
            var e;
            (e = p) == null || e.observe(t)
        })), n()
    }), l && !c && p.observe(l), t && p.observe(t));
    let m, h = c ? ba(e) : null;
    c && g();

    function g() {
        let t = ba(e);
        h && !Ba(h, t) && n(), h = t, m = requestAnimationFrame(g)
    }
    return n(), () => {
        var e;
        u.forEach(e => {
            i && e.removeEventListener(`scroll`, n), a && e.removeEventListener(`resize`, n)
        }), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m)
    }
}
var Ua = zi,
    Wa = Bi,
    Ga = Ni,
    Ka = Hi,
    qa = Ii,
    Ja = Mi,
    Ya = Vi,
    Xa = (e, t, n) => {
        let r = new Map,
            i = n ?? {},
            a = {
                ...za,
                ...i.platform,
                _c: r
            };
        return ji(e, t, {
            ...i,
            platform: a
        })
    },
    Za = typeof document < `u` ? a.useLayoutEffect : function() {};

function Qa(e, t) {
    if (e === t) return !0;
    if (typeof e != typeof t) return !1;
    if (typeof e == `function` && e.toString() === t.toString()) return !0;
    let n, r, i;
    if (e && t && typeof e == `object`) {
        if (Array.isArray(e)) {
            if (n = e.length, n !== t.length) return !1;
            for (r = n; r-- !== 0;)
                if (!Qa(e[r], t[r])) return !1;
            return !0
        }
        if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
        for (r = n; r-- !== 0;)
            if (!{}.hasOwnProperty.call(t, i[r])) return !1;
        for (r = n; r-- !== 0;) {
            let n = i[r];
            if (!(n === `_owner` && e.$$typeof) && !Qa(e[n], t[n])) return !1
        }
        return !0
    }
    return e !== e && t !== t
}

function $a(e) {
    return (e.ownerDocument.defaultView || window).devicePixelRatio || 1
}

function eo(e, t) {
    let n = $a(e);
    return Math.round(t * n) / n
}

function to(e) {
    let t = a.useRef(e);
    return Za(() => {
        t.current = e
    }), t
}

function no(e) {
    e === void 0 && (e = {});
    let {
        placement: t = `bottom`,
        strategy: n = `absolute`,
        middleware: r = [],
        platform: i,
        elements: {
            reference: o,
            floating: s
        } = {},
        transform: c = !0,
        whileElementsMounted: l,
        open: u
    } = e, [d, f] = a.useState({
        x: 0,
        y: 0,
        strategy: n,
        placement: t,
        middlewareData: {},
        isPositioned: !1
    }), [p, m] = a.useState(r);
    Qa(p, r) || m(r);
    let [h, g] = a.useState(null), [_, v] = a.useState(null), y = a.useCallback(e => {
        e !== C.current && (C.current = e, g(e))
    }, []), b = a.useCallback(e => {
        e !== w.current && (w.current = e, v(e))
    }, []), x = o || h, S = s || _, C = a.useRef(null), w = a.useRef(null), T = a.useRef(d), E = l != null, D = to(l), O = to(i), k = to(u), A = a.useCallback(() => {
        if (!C.current || !w.current) return;
        let e = {
            placement: t,
            strategy: n,
            middleware: p
        };
        O.current && (e.platform = O.current), Xa(C.current, w.current, e).then(e => {
            let t = {
                ...e,
                isPositioned: k.current !== !1
            };
            j.current && !Qa(T.current, t) && (T.current = t, de.flushSync(() => {
                f(t)
            }))
        })
    }, [p, t, n, O, k]);
    Za(() => {
        u === !1 && T.current.isPositioned && (T.current.isPositioned = !1, f(e => ({
            ...e,
            isPositioned: !1
        })))
    }, [u]);
    let j = a.useRef(!1);
    Za(() => (j.current = !0, () => {
        j.current = !1
    }), []), Za(() => {
        if (x && (C.current = x), S && (w.current = S), x && S) {
            if (D.current) return D.current(x, S, A);
            A()
        }
    }, [x, S, A, D, E]);
    let M = a.useMemo(() => ({
            reference: C,
            floating: w,
            setReference: y,
            setFloating: b
        }), [y, b]),
        N = a.useMemo(() => ({
            reference: x,
            floating: S
        }), [x, S]),
        P = a.useMemo(() => {
            let e = {
                position: n,
                left: 0,
                top: 0
            };
            if (!N.floating) return e;
            let t = eo(N.floating, d.x),
                r = eo(N.floating, d.y);
            return c ? {
                ...e,
                transform: `translate(` + t + `px, ` + r + `px)`,
                ...$a(N.floating) >= 1.5 && {
                    willChange: `transform`
                }
            } : {
                position: n,
                left: t,
                top: r
            }
        }, [n, c, N.floating, d.x, d.y]);
    return a.useMemo(() => ({
        ...d,
        update: A,
        refs: M,
        elements: N,
        floatingStyles: P
    }), [d, A, M, N, P])
}
var ro = e => {
        function t(e) {
            return {}.hasOwnProperty.call(e, `current`)
        }
        return {
            name: `arrow`,
            options: e,
            fn(n) {
                let {
                    element: r,
                    padding: i
                } = typeof e == `function` ? e(n) : e;
                return r && t(r) ? r.current == null ? {} : Ja({
                    element: r.current,
                    padding: i
                }).fn(n) : r ? Ja({
                    element: r,
                    padding: i
                }).fn(n) : {}
            }
        }
    },
    io = (e, t) => {
        let n = Ua(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    ao = (e, t) => {
        let n = Wa(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    oo = (e, t) => ({
        fn: Ya(e).fn,
        options: [e, t]
    }),
    so = (e, t) => {
        let n = Ga(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    co = (e, t) => {
        let n = Ka(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    lo = (e, t) => {
        let n = qa(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    uo = (e, t) => {
        let n = ro(e);
        return {
            name: n.name,
            fn: n.fn,
            options: [e, t]
        }
    },
    fo = Object.defineProperty,
    po = (e, t) => fo(e, `name`, {
        value: t,
        configurable: !0
    });

function mo(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
po(mo, `setRef`);

function ho(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = mo(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : mo(e[t], null)
            }
        }
    }
}
po(ho, `composeRefs`);

function go(...e) {
    return a.useCallback(ho(...e), e)
}
po(go, `useComposedRefs`);
var _o = Object.defineProperty,
    vo = (e, t) => _o(e, `name`, {
        value: t,
        configurable: !0
    }),
    yo = `Popper`,
    [bo, xo] = W(yo),
    [So, Co] = bo(yo),
    wo = vo(e => {
        let {
            __scopePopper: t,
            children: n
        } = e, [r, i] = a.useState(null), [o, s] = a.useState(void 0);
        return (0, V.jsx)(So, {
            scope: t,
            anchor: r,
            onAnchorChange: i,
            placementState: o,
            setPlacementState: s,
            children: n
        })
    }, `Popper`),
    To = `PopperAnchor`,
    Eo = a.forwardRef(vo(function(e, t) {
        let {
            __scopePopper: n,
            virtualRef: r,
            ...i
        } = e, o = Co(To, n), s = a.useRef(null), c = o.onAnchorChange, l = go(t, a.useCallback(e => {
            s.current = e, e && c(e)
        }, [c])), u = a.useRef(null);
        a.useEffect(() => {
            if (!r) return;
            let e = u.current;
            u.current = r.current, e !== u.current && c(u.current)
        });
        let d = o.placementState && No(o.placementState),
            f = d?.[0],
            p = d?.[1];
        return r ? null : (0, V.jsx)(H.div, {
            "data-radix-popper-side": f,
            "data-radix-popper-align": p,
            ...i,
            ref: l
        })
    }, `PopperAnchor`)),
    Do = `PopperContent`,
    [Oo, ko] = bo(Do),
    Ao = a.forwardRef(vo(function(e, t) {
        let {
            __scopePopper: n,
            side: r = `bottom`,
            sideOffset: i = 0,
            align: o = `center`,
            alignOffset: s = 0,
            arrowPadding: c = 0,
            avoidCollisions: l = !0,
            collisionBoundary: u = [],
            collisionPadding: d = 0,
            sticky: f = `partial`,
            hideWhenDetached: p = !1,
            updatePositionStrategy: m = `optimized`,
            onPlaced: h,
            ...g
        } = e, _ = Co(Do, n), [v, y] = a.useState(null), b = go(t, y), [x, S] = a.useState(null), C = $r(x), w = C?.width ?? 0, T = C?.height ?? 0, E = r + (o === `center` ? `` : `-` + o), D = typeof d == `number` ? d : {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            ...d
        }, O = Array.isArray(u) ? u : [u], k = O.length > 0, A = {
            padding: D,
            boundary: O.filter(jo),
            altBoundary: k
        }, {
            refs: j,
            floatingStyles: M,
            placement: N,
            isPositioned: P,
            middlewareData: F
        } = no({
            strategy: `fixed`,
            placement: E,
            whileElementsMounted: vo((...e) => Ha(...e, {
                animationFrame: m === `always`
            }), `whileElementsMounted`),
            elements: {
                reference: _.anchor
            },
            middleware: [io({
                mainAxis: i + T,
                alignmentAxis: s
            }), l && ao({
                mainAxis: !0,
                crossAxis: !1,
                limiter: f === `partial` ? oo() : void 0,
                ...A
            }), l && so({
                ...A
            }), co({
                ...A,
                apply: vo(({
                    elements: e,
                    rects: t,
                    availableWidth: n,
                    availableHeight: r
                }) => {
                    let {
                        width: i,
                        height: a
                    } = t.reference, o = e.floating.style;
                    o.setProperty(`--radix-popper-available-width`, `${n}px`), o.setProperty(`--radix-popper-available-height`, `${r}px`), o.setProperty(`--radix-popper-anchor-width`, `${i}px`), o.setProperty(`--radix-popper-anchor-height`, `${a}px`)
                }, `apply`)
            }), x && uo({
                element: x,
                padding: c
            }), Mo({
                arrowWidth: w,
                arrowHeight: T
            }), p && lo({
                strategy: `referenceHidden`,
                ...A,
                boundary: k ? A.boundary : void 0
            })]
        }), I = _.setPlacementState;
        q(() => (I(N), () => {
            I(void 0)
        }), [N, I]);
        let [ee, L] = No(N), te = Ht(h);
        q(() => {
            P && te?.()
        }, [P, te]);
        let ne = F.arrow?.x,
            R = F.arrow?.y,
            z = F.arrow?.centerOffset !== 0,
            [re, ie] = a.useState();
        return q(() => {
            v && ie(window.getComputedStyle(v).zIndex)
        }, [v]), (0, V.jsx)(`div`, {
            ref: j.setFloating,
            "data-radix-popper-content-wrapper": ``,
            style: {
                ...M,
                transform: P ? M.transform : `translate(0, -200%)`,
                minWidth: `max-content`,
                zIndex: re,
                "--radix-popper-transform-origin": [F.transformOrigin?.x, F.transformOrigin?.y].join(` `),
                ...F.hide?.referenceHidden && {
                    visibility: `hidden`,
                    pointerEvents: `none`
                }
            },
            dir: e.dir,
            children: (0, V.jsx)(Oo, {
                scope: n,
                placedSide: ee,
                placedAlign: L,
                onArrowChange: S,
                arrowX: ne,
                arrowY: R,
                shouldHideArrow: z,
                children: (0, V.jsx)(H.div, {
                    "data-side": ee,
                    "data-align": L,
                    ...g,
                    ref: b,
                    style: {
                        ...g.style,
                        animation: P ? g.style?.animation : `none`
                    }
                })
            })
        })
    }, `PopperContent`));

function jo(e) {
    return e !== null
}
vo(jo, `isNotNull`);
var Mo = vo(e => ({
    name: `transformOrigin`,
    options: e,
    fn(t) {
        let {
            placement: n,
            rects: r,
            middlewareData: i
        } = t, a = i.arrow?.centerOffset !== 0, o = a ? 0 : e.arrowWidth, s = a ? 0 : e.arrowHeight, [c, l] = No(n), u = {
            start: `0%`,
            center: `50%`,
            end: `100%`
        } [l], d = (i.arrow?.x ?? 0) + o / 2, f = (i.arrow?.y ?? 0) + s / 2, p = ``, m = ``;
        return c === `bottom` ? (p = a ? u : `${d}px`, m = `${-s}px`) : c === `top` ? (p = a ? u : `${d}px`, m = `${r.floating.height+s}px`) : c === `right` ? (p = `${-s}px`, m = a ? u : `${f}px`) : c === `left` && (p = `${r.floating.width+s}px`, m = a ? u : `${f}px`), {
            data: {
                x: p,
                y: m
            }
        }
    }
}), `transformOrigin`);

function No(e) {
    let [t, n = `center`] = e.split(`-`);
    return [t, n]
}
vo(No, `getSideAndAlignFromPlacement`);
var Po = wo,
    Fo = Eo,
    Io = Ao,
    Lo = Object.defineProperty,
    Ro = (e, t) => Lo(e, `name`, {
        value: t,
        configurable: !0
    });

function zo(e) {
    let t = a.useRef({
        value: e,
        previous: e
    });
    return a.useMemo(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e])
}
Ro(zo, `usePrevious`);
var Bo = Object.defineProperty,
    Vo = (e, t) => Bo(e, `name`, {
        value: t,
        configurable: !0
    });

function Ho(e, [t, n]) {
    return Math.min(n, Math.max(t, e))
}
Vo(Ho, `clamp`);
var Uo = Object.defineProperty,
    Wo = (e, t) => Uo(e, `name`, {
        value: t,
        configurable: !0
    }),
    Go = `Progress`,
    Ko = 100,
    [qo, Jo] = W(Go),
    [Yo, Xo] = qo(Go),
    Zo = a.forwardRef(Wo(function(e, t) {
        let {
            __scopeProgress: n,
            value: r = null,
            max: i,
            getValueLabel: a = es,
            ...o
        } = e;
        (i || i === 0) && !rs(i) && console.error(as(`${i}`, `Progress`));
        let s = rs(i) ? i : Ko;
        r !== null && !is(r, s) && console.error(os(`${r}`, `Progress`));
        let c = is(r, s) ? r : null,
            l = ns(c) ? a(c, s) : void 0;
        return (0, V.jsx)(Yo, {
            scope: n,
            value: c,
            max: s,
            children: (0, V.jsx)(H.div, {
                "aria-valuemax": s,
                "aria-valuemin": 0,
                "aria-valuenow": ns(c) ? c : void 0,
                "aria-valuetext": l,
                role: `progressbar`,
                "data-state": ts(c, s),
                "data-value": c ?? void 0,
                "data-max": s,
                ...o,
                ref: t
            })
        })
    }, `Progress`)),
    Qo = `ProgressIndicator`,
    $o = a.forwardRef(Wo(function(e, t) {
        let {
            __scopeProgress: n,
            ...r
        } = e, i = Xo(Qo, n);
        return (0, V.jsx)(H.div, {
            "data-state": ts(i.value, i.max),
            "data-value": i.value ?? void 0,
            "data-max": i.max,
            ...r,
            ref: t
        })
    }, `ProgressIndicator`));

function es(e, t) {
    return `${Math.round(e/t*100)}%`
}
Wo(es, `defaultGetValueLabel`);

function ts(e, t) {
    return e == null ? `indeterminate` : e === t ? `complete` : `loading`
}
Wo(ts, `getProgressState`);

function ns(e) {
    return typeof e == `number`
}
Wo(ns, `isNumber`);

function rs(e) {
    return ns(e) && !isNaN(e) && e > 0
}
Wo(rs, `isValidMaxNumber`);

function is(e, t) {
    return ns(e) && !isNaN(e) && e <= t && e >= 0
}
Wo(is, `isValidValueNumber`);

function as(e, t) {
    return `Invalid prop \`max\` of value \`${e}\` supplied to \`${t}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${Ko}\`.`
}
Wo(as, `getInvalidMaxError`);

function os(e, t) {
    return `Invalid prop \`value\` of value \`${e}\` supplied to \`${t}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${Ko} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`
}
Wo(os, `getInvalidValueError`);
var ss = Zo,
    cs = $o,
    ls = Object.defineProperty,
    us = (e, t) => ls(e, `name`, {
        value: t,
        configurable: !0
    });

function ds(e, t) {
    if (typeof e == `function`) return e(t);
    e != null && (e.current = t)
}
us(ds, `setRef`);

function fs(...e) {
    return t => {
        let n = !1,
            r = e.map(e => {
                let r = ds(e, t);
                return !n && typeof r == `function` && (n = !0), r
            });
        if (n) return () => {
            for (let t = 0; t < r.length; t++) {
                let n = r[t];
                typeof n == `function` ? n() : ds(e[t], null)
            }
        }
    }
}
us(fs, `composeRefs`);

function ps(...e) {
    return a.useCallback(fs(...e), e)
}
us(ps, `useComposedRefs`);
var ms = Object.defineProperty,
    hs = (e, t) => ms(e, `name`, {
        value: t,
        configurable: !0
    });

function gs(e) {
    let t = a.forwardRef((t, n) => {
        let {
            children: r,
            ...i
        } = t, o = null, s = !1, c = [];
        ws(r) && typeof Os == `function` && (r = Os(r._payload)), a.Children.forEach(r, e => {
            if (Ss(e)) {
                s = !0;
                let t = e,
                    n = `child` in t.props ? t.props.child : t.props.children;
                ws(n) && typeof Os == `function` && (n = Os(n._payload)), o = ys(t, n), c.push(o?.props?.children)
            } else c.push(e)
        }), o ? o = a.cloneElement(o, void 0, c) : !s && a.Children.count(r) === 1 && a.isValidElement(r) && (o = r);
        let l = o ? xs(o) : void 0,
            u = ps(n, l);
        if (!o) {
            if (r || r === 0) throw Error(s ? Ds(e) : Es(e));
            return r
        }
        let d = bs(i, o.props ?? {});
        return o.type !== a.Fragment && (d.ref = n ? u : l), a.cloneElement(o, d)
    });
    return t.displayName = `${e}.Slot`, t
}
hs(gs, `createSlot`);
var _s = Symbol.for(`radix.slottable`);

function vs(e) {
    let t = hs(e => `child` in e ? e.children(e.child) : e.children, `Slottable`);
    return t.displayName = `${e}.Slottable`, t.__radixId = _s, t
}
hs(vs, `createSlottable`);
var ys = hs((e, t) => {
    if (`child` in e.props) {
        let t = e.props.child;
        return a.isValidElement(t) ? a.cloneElement(t, void 0, e.props.children(t.props.children)) : null
    }
    return a.isValidElement(t) ? t : null
}, `getSlottableElementFromSlottable`);

function bs(e, t) {
    let n = {
        ...t
    };
    for (let r in t) {
        let i = e[r],
            a = t[r];
        /^on[A-Z]/.test(r) ? i && a ? n[r] = (...e) => {
            let t = a(...e);
            return i(...e), t
        } : i && (n[r] = i) : r === `style` ? n[r] = {
            ...i,
            ...a
        } : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `))
    }
    return {
        ...e,
        ...n
    }
}
hs(bs, `mergeProps`);

function xs(e) {
    let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
        n = t && `isReactWarning` in t && t.isReactWarning;
    return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, `ref`)?.get, n = t && `isReactWarning` in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref)
}
hs(xs, `getElementRef`);

function Ss(e) {
    return a.isValidElement(e) && typeof e.type == `function` && `__radixId` in e.type && e.type.__radixId === _s
}
hs(Ss, `isSlottable`);
var Cs = Symbol.for(`react.lazy`);

function ws(e) {
    return typeof e == `object` && !!e && `$$typeof` in e && e.$$typeof === Cs && `_payload` in e && Ts(e._payload)
}
hs(ws, `isLazyComponent`);

function Ts(e) {
    return typeof e == `object` && !!e && `then` in e
}
hs(Ts, `isPromiseLike`);
var Es = hs(e => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, `createSlotError`),
    Ds = hs(e => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, `createSlottableError`),
    Os = a.use,
    ks = Object.defineProperty,
    Y = (e, t) => ks(e, `name`, {
        value: t,
        configurable: !0
    }),
    As = [` `, `Enter`, `ArrowUp`, `ArrowDown`],
    js = [` `, `Enter`],
    Ms = `Select`,
    [Ns, Ps, Fs] = Be(Ms),
    [Is, Ls] = W(Ms, [Fs, xo]),
    Rs = xo(),
    [zs, Bs] = Is(Ms),
    [Vs, Hs] = Is(Ms);

function Us(e) {
    let {
        __scopeSelect: t,
        children: n,
        open: r,
        defaultOpen: i,
        onOpenChange: o,
        value: s,
        defaultValue: c,
        onValueChange: l,
        dir: u,
        name: d,
        autoComplete: f,
        disabled: p,
        required: m,
        form: h,
        internal_do_not_use_render: g
    } = e, _ = Rs(t), [v, y] = a.useState(null), [b, x] = a.useState(null), [S, C] = a.useState(!1), w = Pt(u), [T, E] = ft({
        prop: r,
        defaultProp: i ?? !1,
        onChange: o,
        caller: Ms
    }), [D, O] = ft({
        prop: s,
        defaultProp: c,
        onChange: l,
        caller: Ms
    }), k = a.useRef(null), A = a.useRef(D);
    a.useEffect(() => {
        let e = h ? v?.ownerDocument.getElementById(h) : v?.form;
        if (e instanceof HTMLFormElement) {
            let t = Y(() => O(A.current), `reset`);
            return e.addEventListener(`reset`, t), () => e.removeEventListener(`reset`, t)
        }
    }, [h, v, O]);
    let j = v ? !!h || !!v.closest(`form`) : !0,
        [M, N] = a.useState(new Set),
        P = At(),
        F = Array.from(M).map(e => e.props.value).join(`;`),
        I = a.useCallback(e => {
            N(t => new Set(t).add(e))
        }, []),
        ee = a.useCallback(e => {
            N(t => {
                let n = new Set(t);
                return n.delete(e), n
            })
        }, []),
        L = {
            required: m,
            trigger: v,
            onTriggerChange: y,
            valueNode: b,
            onValueNodeChange: x,
            valueNodeHasChildren: S,
            onValueNodeHasChildrenChange: C,
            contentId: P,
            value: D,
            onValueChange: O,
            open: T,
            onOpenChange: E,
            dir: w,
            triggerPointerDownPosRef: k,
            disabled: p,
            name: d,
            autoComplete: f,
            form: h,
            nativeOptions: M,
            nativeSelectKey: F,
            isFormControl: j
        };
    return (0, V.jsx)(Po, {
        ..._,
        children: (0, V.jsx)(zs, {
            scope: t,
            ...L,
            children: (0, V.jsx)(Ns.Provider, {
                scope: t,
                children: (0, V.jsx)(Vs, {
                    scope: t,
                    onNativeOptionAdd: I,
                    onNativeOptionRemove: ee,
                    children: Nc(g) ? g(L) : n
                })
            })
        })
    })
}
Y(Us, `SelectProvider`);
var Ws = Y(e => {
        let {
            __scopeSelect: t,
            children: n,
            ...r
        } = e;
        return (0, V.jsx)(Us, {
            __scopeSelect: t,
            ...r,
            internal_do_not_use_render: ({
                isFormControl: e
            }) => (0, V.jsxs)(V.Fragment, {
                children: [n, e ? (0, V.jsx)(Mc, {
                    __scopeSelect: t
                }) : null]
            })
        })
    }, `Select`),
    Gs = `SelectTrigger`,
    Ks = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            disabled: r = !1,
            ...i
        } = e, o = Rs(n), s = Bs(Gs, n), c = s.disabled || r, l = ps(t, s.onTriggerChange), u = Ps(n), d = a.useRef(`touch`), [f, p, m] = Fc(e => {
            let t = u().filter(e => !e.disabled),
                n = Ic(t, e, t.find(e => e.value === s.value));
            n !== void 0 && s.onValueChange(n.value)
        }), h = Y(e => {
            c || (s.onOpenChange(!0), m()), e && (s.triggerPointerDownPosRef.current = {
                x: Math.round(e.pageX),
                y: Math.round(e.pageY)
            })
        }, `handleOpen`);
        return (0, V.jsx)(Fo, {
            asChild: !0,
            ...o,
            children: (0, V.jsx)(H.button, {
                type: `button`,
                role: `combobox`,
                "aria-controls": s.open ? s.contentId : void 0,
                "aria-expanded": s.open,
                "aria-required": s.required,
                "aria-autocomplete": `none`,
                dir: s.dir,
                "data-state": s.open ? `open` : `closed`,
                disabled: c,
                "data-disabled": c ? `` : void 0,
                "data-placeholder": Pc(s.value) ? `` : void 0,
                ...i,
                ref: l,
                onClick: K(i.onClick, e => {
                    e.currentTarget.focus(), d.current !== `mouse` && h(e)
                }),
                onPointerDown: K(i.onPointerDown, e => {
                    d.current = e.pointerType;
                    let t = e.target;
                    t.hasPointerCapture(e.pointerId) && t.releasePointerCapture(e.pointerId), e.button === 0 && e.ctrlKey === !1 && e.pointerType === `mouse` && (h(e), e.preventDefault())
                }),
                onKeyDown: K(i.onKeyDown, e => {
                    let t = f.current !== ``;
                    !(e.ctrlKey || e.altKey || e.metaKey) && e.key.length === 1 && p(e.key), !(t && e.key === ` `) && As.includes(e.key) && (h(), e.preventDefault())
                })
            })
        })
    }, `SelectTrigger`)),
    qs = `SelectValue`,
    Js = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            className: r,
            style: i,
            children: o,
            placeholder: s = ``,
            ...c
        } = e, l = Bs(qs, n), {
            onValueNodeHasChildrenChange: u
        } = l, d = o !== void 0, f = ps(t, l.onValueNodeChange);
        q(() => {
            u(d)
        }, [u, d]);
        let p = Pc(l.value);
        return (0, V.jsx)(H.span, {
            ...c,
            asChild: p ? !1 : c.asChild,
            ref: f,
            style: {
                pointerEvents: `none`
            },
            children: (0, V.jsx)(a.Fragment, {
                children: p ? s : o
            }, p ? `placeholder` : `value`)
        })
    }, `SelectValue`)),
    Ys = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            children: r,
            ...i
        } = e;
        return (0, V.jsx)(H.span, {
            "aria-hidden": !0,
            ...i,
            ref: t,
            children: r || `▼`
        })
    }, `SelectIcon`)),
    [Xs, Zs] = Is(`SelectPortal`, {
        forceMount: void 0
    }),
    Qs = Y(e => {
        let {
            __scopeSelect: t,
            forceMount: n,
            ...r
        } = e;
        return (0, V.jsx)(Xs, {
            scope: e.__scopeSelect,
            forceMount: n,
            children: (0, V.jsx)(En, {
                asChild: !0,
                ...r
            })
        })
    }, `SelectPortal`),
    $s = `SelectContent`,
    ec = a.forwardRef(Y(function(e, t) {
        let n = Zs($s, e.__scopeSelect),
            {
                forceMount: r = n.forceMount,
                ...i
            } = e,
            o = Bs($s, e.__scopeSelect),
            [s, c] = a.useState();
        return q(() => {
            c(new DocumentFragment)
        }, []), (0, V.jsx)(bt, {
            present: r || o.open,
            children: ({
                present: e
            }) => e ? (0, V.jsx)(oc, {
                ...i,
                ref: t
            }) : (0, V.jsx)(tc, {
                ...i,
                fragment: s
            })
        })
    }, `SelectContent`)),
    tc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            children: r,
            fragment: i
        } = e;
        return i ? de.createPortal((0, V.jsx)(rc, {
            scope: n,
            children: (0, V.jsx)(Ns.Slot, {
                scope: n,
                children: (0, V.jsx)(`div`, {
                    ref: t,
                    children: r
                })
            })
        }), i) : null
    }, `SelectContentFragment`)),
    nc = 10,
    [rc, ic] = Is($s),
    ac = gs(`SelectContent.RemoveScroll`),
    oc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n
        } = e, {
            position: r = `item-aligned`,
            onCloseAutoFocus: i,
            onEscapeKeyDown: o,
            onPointerDownOutside: s,
            side: c,
            sideOffset: l,
            align: u,
            alignOffset: d,
            arrowPadding: f,
            collisionBoundary: p,
            collisionPadding: m,
            sticky: h,
            hideWhenDetached: g,
            avoidCollisions: _,
            ...v
        } = e, y = Bs($s, n), [b, x] = a.useState(null), [S, C] = a.useState(null), w = ps(t, x), [T, E] = a.useState(null), [D, O] = a.useState(null), k = Ps(n), [A, j] = a.useState(!1), M = a.useRef(!1);
        a.useEffect(() => {
            if (b) return Xr(b)
        }, [b]), Mn();
        let N = a.useCallback(e => {
                let [t, ...n] = k().map(e => e.ref.current), [r] = n.slice(-1), i = document.activeElement;
                for (let n of e)
                    if (n === i || (n?.scrollIntoView({
                            block: `nearest`
                        }), n === t && S && (S.scrollTop = 0), n === r && S && (S.scrollTop = S.scrollHeight), n?.focus(), document.activeElement !== i)) return
            }, [k, S]),
            P = a.useCallback(() => N([T, b]), [N, T, b]);
        a.useEffect(() => {
            A && P()
        }, [A, P]);
        let {
            onOpenChange: F,
            triggerPointerDownPosRef: I
        } = y;
        a.useEffect(() => {
            if (b) {
                let e = {
                        x: 0,
                        y: 0
                    },
                    t = Y(t => {
                        e = {
                            x: Math.abs(Math.round(t.pageX) - (I.current?.x ?? 0)),
                            y: Math.abs(Math.round(t.pageY) - (I.current?.y ?? 0))
                        }
                    }, `handlePointerMove`),
                    n = Y(n => {
                        e.x <= 10 && e.y <= 10 ? n.preventDefault() : n.composedPath().includes(b) || F(!1), document.removeEventListener(`pointermove`, t), I.current = null
                    }, `handlePointerUp`);
                return I.current !== null && (document.addEventListener(`pointermove`, t), document.addEventListener(`pointerup`, n, {
                    capture: !0,
                    once: !0
                })), () => {
                    document.removeEventListener(`pointermove`, t), document.removeEventListener(`pointerup`, n, {
                        capture: !0
                    })
                }
            }
        }, [b, F, I]), a.useEffect(() => {
            let e = Y(() => F(!1), `close`);
            return window.addEventListener(`blur`, e), window.addEventListener(`resize`, e), () => {
                window.removeEventListener(`blur`, e), window.removeEventListener(`resize`, e)
            }
        }, [F]);
        let [ee, L] = Fc(e => {
            let t = k().filter(e => !e.disabled),
                n = Ic(t, e, t.find(e => e.ref.current === document.activeElement));
            n && setTimeout(() => n.ref.current?.focus())
        }), te = a.useCallback((e, t, n) => {
            let r = !M.current && !n;
            (y.value !== void 0 && y.value === t || r) && (E(e), r && (M.current = !0))
        }, [y.value]), ne = a.useCallback(() => b?.focus(), [b]), R = a.useCallback((e, t, n) => {
            let r = !M.current && !n;
            (y.value !== void 0 && y.value === t || r) && O(e)
        }, [y.value]), z = r === `popper` ? cc : sc, re = z === cc ? {
            side: c,
            sideOffset: l,
            align: u,
            alignOffset: d,
            arrowPadding: f,
            collisionBoundary: p,
            collisionPadding: m,
            sticky: h,
            hideWhenDetached: g,
            avoidCollisions: _
        } : {};
        return (0, V.jsx)(rc, {
            scope: n,
            content: b,
            viewport: S,
            onViewportChange: C,
            itemRefCallback: te,
            selectedItem: T,
            onItemLeave: ne,
            itemTextRefCallback: R,
            focusSelectedItem: P,
            selectedItemText: D,
            position: r,
            isPositioned: A,
            searchRef: ee,
            children: (0, V.jsx)(Vr, {
                as: ac,
                allowPinchZoom: !0,
                children: (0, V.jsx)(pn, {
                    asChild: !0,
                    trapped: y.open,
                    onMountAutoFocus: e => {
                        e.preventDefault()
                    },
                    onUnmountAutoFocus: K(i, e => {
                        y.trigger?.focus({
                            preventScroll: !0
                        }), e.preventDefault()
                    }),
                    children: (0, V.jsx)(Yt, {
                        asChild: !0,
                        disableOutsidePointerEvents: !0,
                        onEscapeKeyDown: o,
                        onPointerDownOutside: s,
                        onFocusOutside: e => e.preventDefault(),
                        onDismiss: () => y.onOpenChange(!1),
                        children: (0, V.jsx)(z, {
                            role: `listbox`,
                            id: y.contentId,
                            "data-state": y.open ? `open` : `closed`,
                            dir: y.dir,
                            onContextMenu: e => e.preventDefault(),
                            ...v,
                            ...re,
                            onPlaced: () => j(!0),
                            ref: w,
                            style: {
                                display: `flex`,
                                flexDirection: `column`,
                                outline: `none`,
                                ...v.style
                            },
                            onKeyDown: K(v.onKeyDown, e => {
                                let t = e.ctrlKey || e.altKey || e.metaKey;
                                if (e.key === `Tab` && e.preventDefault(), !t && e.key.length === 1 && L(e.key), [`ArrowUp`, `ArrowDown`, `Home`, `End`].includes(e.key)) {
                                    let t = k().filter(e => !e.disabled).map(e => e.ref.current);
                                    if ([`ArrowUp`, `End`].includes(e.key) && (t = t.slice().reverse()), [`ArrowUp`, `ArrowDown`].includes(e.key)) {
                                        let n = e.target,
                                            r = t.indexOf(n);
                                        t = t.slice(r + 1)
                                    }
                                    setTimeout(() => N(t)), e.preventDefault()
                                }
                            })
                        })
                    })
                })
            })
        })
    }, `SelectContentImpl`)),
    sc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            onPlaced: r,
            ...i
        } = e, o = Bs($s, n), s = ic($s, n), [c, l] = a.useState(null), [u, d] = a.useState(null), f = ps(t, d), p = Ps(n), m = a.useRef(!1), h = a.useRef(!0), {
            viewport: g,
            selectedItem: _,
            selectedItemText: v,
            focusSelectedItem: y
        } = s, b = a.useCallback(() => {
            if (o.trigger && o.valueNode && c && u && g && _ && v) {
                let e = o.trigger.getBoundingClientRect(),
                    t = u.getBoundingClientRect(),
                    n = o.valueNode.getBoundingClientRect(),
                    i = v.getBoundingClientRect();
                if (o.dir !== `rtl`) {
                    let r = i.left - t.left,
                        a = n.left - r,
                        o = e.left - a,
                        s = e.width + o,
                        l = Math.max(s, t.width),
                        u = window.innerWidth - nc,
                        d = Ho(a, [nc, Math.max(nc, u - l)]);
                    c.style.minWidth = s + `px`, c.style.left = d + `px`
                } else {
                    let r = t.right - i.right,
                        a = window.innerWidth - n.right - r,
                        o = window.innerWidth - e.right - a,
                        s = e.width + o,
                        l = Math.max(s, t.width),
                        u = window.innerWidth - nc,
                        d = Ho(a, [nc, Math.max(nc, u - l)]);
                    c.style.minWidth = s + `px`, c.style.right = d + `px`
                }
                let a = p(),
                    s = window.innerHeight - nc * 2,
                    l = g.scrollHeight,
                    d = window.getComputedStyle(u),
                    f = parseInt(d.borderTopWidth, 10),
                    h = parseInt(d.paddingTop, 10),
                    y = parseInt(d.borderBottomWidth, 10),
                    b = parseInt(d.paddingBottom, 10),
                    x = f + h + l + b + y,
                    S = Math.min(_.offsetHeight * 5, x),
                    C = window.getComputedStyle(g),
                    w = parseInt(C.paddingTop, 10),
                    T = parseInt(C.paddingBottom, 10),
                    E = e.top + e.height / 2 - nc,
                    D = s - E,
                    O = _.offsetHeight / 2,
                    k = _.offsetTop + O,
                    A = f + h + k,
                    j = x - A;
                if (A <= E) {
                    let e = a.length > 0 && _ === a[a.length - 1].ref.current;
                    c.style.bottom = `0px`;
                    let t = u.clientHeight - g.offsetTop - g.offsetHeight,
                        n = A + Math.max(D, O + (e ? T : 0) + t + y);
                    c.style.height = n + `px`
                } else {
                    let e = a.length > 0 && _ === a[0].ref.current;
                    c.style.top = `0px`;
                    let t = Math.max(E, f + g.offsetTop + (e ? w : 0) + O) + j;
                    c.style.height = t + `px`, g.scrollTop = A - E + g.offsetTop
                }
                c.style.margin = `${nc}px 0`, c.style.minHeight = S + `px`, c.style.maxHeight = s + `px`, r?.(), requestAnimationFrame(() => m.current = !0)
            }
        }, [p, o.trigger, o.valueNode, c, u, g, _, v, o.dir, r]);
        q(() => b(), [b]);
        let [x, S] = a.useState();
        return q(() => {
            u && S(window.getComputedStyle(u).zIndex)
        }, [u]), (0, V.jsx)(lc, {
            scope: n,
            contentWrapper: c,
            shouldExpandOnScrollRef: m,
            onScrollButtonChange: a.useCallback(e => {
                e && h.current === !0 && (b(), y?.(), h.current = !1)
            }, [b, y]),
            children: (0, V.jsx)(`div`, {
                ref: l,
                style: {
                    display: `flex`,
                    flexDirection: `column`,
                    position: `fixed`,
                    zIndex: x
                },
                children: (0, V.jsx)(H.div, {
                    ...i,
                    ref: f,
                    style: {
                        boxSizing: `border-box`,
                        maxHeight: `100%`,
                        ...i.style
                    }
                })
            })
        })
    }, `SelectItemAlignedPosition`)),
    cc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            align: r = `start`,
            collisionPadding: i = nc,
            ...a
        } = e, o = Rs(n);
        return (0, V.jsx)(Io, {
            ...o,
            ...a,
            ref: t,
            align: r,
            collisionPadding: i,
            style: {
                boxSizing: `border-box`,
                ...a.style,
                "--radix-select-content-transform-origin": `var(--radix-popper-transform-origin)`,
                "--radix-select-content-available-width": `var(--radix-popper-available-width)`,
                "--radix-select-content-available-height": `var(--radix-popper-available-height)`,
                "--radix-select-trigger-width": `var(--radix-popper-anchor-width)`,
                "--radix-select-trigger-height": `var(--radix-popper-anchor-height)`
            }
        })
    }, `SelectPopperPosition`)),
    [lc, uc] = Is($s, {}),
    dc = `SelectViewport`,
    fc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            nonce: r,
            ...i
        } = e, o = ic(dc, n), s = uc(dc, n), c = ps(t, o.onViewportChange), l = a.useRef(0);
        return (0, V.jsxs)(V.Fragment, {
            children: [(0, V.jsx)(`style`, {
                dangerouslySetInnerHTML: {
                    __html: `[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}`
                },
                nonce: r
            }), (0, V.jsx)(Ns.Slot, {
                scope: n,
                children: (0, V.jsx)(H.div, {
                    "data-radix-select-viewport": ``,
                    role: `presentation`,
                    ...i,
                    ref: c,
                    style: {
                        position: `relative`,
                        flex: 1,
                        overflow: `hidden auto`,
                        ...i.style
                    },
                    onScroll: K(i.onScroll, e => {
                        let t = e.currentTarget,
                            {
                                contentWrapper: n,
                                shouldExpandOnScrollRef: r
                            } = s;
                        if (r?.current && n) {
                            let e = Math.abs(l.current - t.scrollTop);
                            if (e > 0) {
                                let r = window.innerHeight - nc * 2,
                                    i = parseFloat(n.style.minHeight),
                                    a = parseFloat(n.style.height),
                                    o = Math.max(i, a);
                                if (o < r) {
                                    let i = o + e,
                                        a = Math.min(r, i),
                                        s = i - a;
                                    n.style.height = a + `px`, n.style.bottom === `0px` && (t.scrollTop = s > 0 ? s : 0, n.style.justifyContent = `flex-end`)
                                }
                            }
                        }
                        l.current = t.scrollTop
                    })
                })
            })]
        })
    }, `SelectViewport`)),
    [pc, mc] = Is(`SelectGroup`),
    hc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            ...r
        } = e, i = At();
        return (0, V.jsx)(pc, {
            scope: n,
            id: i,
            children: (0, V.jsx)(H.div, {
                role: `group`,
                "aria-labelledby": i,
                ...r,
                ref: t
            })
        })
    }, `SelectGroup`)),
    gc = `SelectLabel`,
    _c = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            ...r
        } = e, i = mc(gc, n);
        return (0, V.jsx)(H.div, {
            id: i.id,
            ...r,
            ref: t
        })
    }, `SelectLabel`)),
    vc = `SelectItem`,
    [yc, bc] = Is(vc),
    xc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            value: r,
            disabled: i = !1,
            textValue: o,
            ...s
        } = e, c = Bs(vc, n), l = ic(vc, n), u = c.value === r, [d, f] = a.useState(o ?? ``), [p, m] = a.useState(!1), h = ps(t, Ht(e => l.itemRefCallback?.(e, r, i))), g = At(), _ = a.useRef(`touch`), v = Y(() => {
            i || (c.onValueChange(r), c.onOpenChange(!1))
        }, `handleSelect`);
        return (0, V.jsx)(yc, {
            scope: n,
            value: r,
            disabled: i,
            textId: g,
            isSelected: u,
            onItemTextChange: a.useCallback(e => {
                f(t => t || (e?.textContent ?? ``).trim())
            }, []),
            children: (0, V.jsx)(Ns.ItemSlot, {
                scope: n,
                value: r,
                disabled: i,
                textValue: d,
                children: (0, V.jsx)(H.div, {
                    role: `option`,
                    "aria-labelledby": g,
                    "data-highlighted": p ? `` : void 0,
                    "aria-selected": u && p,
                    "data-state": u ? `checked` : `unchecked`,
                    "aria-disabled": i || void 0,
                    "data-disabled": i ? `` : void 0,
                    tabIndex: i ? void 0 : -1,
                    ...s,
                    ref: h,
                    onFocus: K(s.onFocus, () => m(!0)),
                    onBlur: K(s.onBlur, () => m(!1)),
                    onClick: K(s.onClick, () => {
                        _.current !== `mouse` && v()
                    }),
                    onPointerUp: K(s.onPointerUp, () => {
                        _.current === `mouse` && v()
                    }),
                    onPointerDown: K(s.onPointerDown, e => {
                        _.current = e.pointerType
                    }),
                    onPointerMove: K(s.onPointerMove, e => {
                        _.current = e.pointerType, i ? l.onItemLeave?.() : _.current === `mouse` && e.currentTarget.focus({
                            preventScroll: !0
                        })
                    }),
                    onPointerLeave: K(s.onPointerLeave, e => {
                        e.currentTarget === document.activeElement && l.onItemLeave?.()
                    }),
                    onKeyDown: K(s.onKeyDown, e => {
                        i || e.target !== e.currentTarget || l.searchRef?.current !== `` && e.key === ` ` || (js.includes(e.key) && v(), e.key === ` ` && e.preventDefault())
                    })
                })
            })
        })
    }, `SelectItem`)),
    Sc = `SelectItemText`,
    Cc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            className: r,
            style: i,
            ...o
        } = e, s = Bs(Sc, n), c = ic(Sc, n), l = bc(Sc, n), u = Hs(Sc, n), [d, f] = a.useState(null), p = Ht(e => c.itemTextRefCallback?.(e, l.value, l.disabled)), m = ps(t, f, l.onItemTextChange, p), h = d?.textContent, g = a.useMemo(() => (0, V.jsx)(`option`, {
            value: l.value,
            disabled: l.disabled,
            children: h
        }, l.value), [l.disabled, l.value, h]), {
            onNativeOptionAdd: _,
            onNativeOptionRemove: v
        } = u;
        return q(() => (_(g), () => v(g)), [_, v, g]), (0, V.jsxs)(V.Fragment, {
            children: [(0, V.jsx)(H.span, {
                id: l.textId,
                ...o,
                ref: m
            }), l.isSelected && s.valueNode && !s.valueNodeHasChildren && !Pc(s.value) ? de.createPortal(o.children, s.valueNode) : null]
        })
    }, `SelectItemText`)),
    wc = `SelectItemIndicator`,
    Tc = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            ...r
        } = e;
        return bc(wc, n).isSelected ? (0, V.jsx)(H.span, {
            "aria-hidden": !0,
            ...r,
            ref: t
        }) : null
    }, `SelectItemIndicator`)),
    Ec = `SelectScrollUpButton`,
    Dc = a.forwardRef(Y(function(e, t) {
        let n = ic(Ec, e.__scopeSelect),
            r = uc(Ec, e.__scopeSelect),
            [i, o] = a.useState(!1),
            s = ps(t, r.onScrollButtonChange);
        return q(() => {
            if (n.viewport && n.isPositioned) {
                let e = function() {
                    o(t.scrollTop > 0)
                };
                Y(e, `handleScroll`);
                let t = n.viewport;
                return e(), t.addEventListener(`scroll`, e), () => t.removeEventListener(`scroll`, e)
            }
        }, [n.viewport, n.isPositioned]), i ? (0, V.jsx)(Ac, {
            ...e,
            ref: s,
            onAutoScroll: () => {
                let {
                    viewport: e,
                    selectedItem: t
                } = n;
                e && t && (e.scrollTop -= t.offsetHeight)
            }
        }) : null
    }, `SelectScrollUpButton`)),
    Oc = `SelectScrollDownButton`,
    kc = a.forwardRef(Y(function(e, t) {
        let n = ic(Oc, e.__scopeSelect),
            r = uc(Oc, e.__scopeSelect),
            [i, o] = a.useState(!1),
            s = ps(t, r.onScrollButtonChange);
        return q(() => {
            if (n.viewport && n.isPositioned) {
                let e = function() {
                    let e = t.scrollHeight - t.clientHeight;
                    o(Math.ceil(t.scrollTop) < e)
                };
                Y(e, `handleScroll`);
                let t = n.viewport;
                return e(), t.addEventListener(`scroll`, e), () => t.removeEventListener(`scroll`, e)
            }
        }, [n.viewport, n.isPositioned]), i ? (0, V.jsx)(Ac, {
            ...e,
            ref: s,
            onAutoScroll: () => {
                let {
                    viewport: e,
                    selectedItem: t
                } = n;
                e && t && (e.scrollTop += t.offsetHeight)
            }
        }) : null
    }, `SelectScrollDownButton`)),
    Ac = a.forwardRef(Y(function(e, t) {
        let {
            __scopeSelect: n,
            onAutoScroll: r,
            ...i
        } = e, o = ic(`SelectScrollButton`, n), s = a.useRef(null), c = Ps(n), l = a.useCallback(() => {
            s.current !== null && (window.clearInterval(s.current), s.current = null)
        }, []);
        return a.useEffect(() => () => l(), [l]), q(() => {
            c().find(e => e.ref.current === document.activeElement)?.ref.current?.scrollIntoView({
                block: `nearest`
            })
        }, [c]), (0, V.jsx)(H.div, {
            "aria-hidden": !0,
            ...i,
            ref: t,
            style: {
                flexShrink: 0,
                ...i.style
            },
            onPointerDown: K(i.onPointerDown, () => {
                s.current === null && (s.current = window.setInterval(r, 50))
            }),
            onPointerMove: K(i.onPointerMove, () => {
                o.onItemLeave?.(), s.current === null && (s.current = window.setInterval(r, 50))
            }),
            onPointerLeave: K(i.onPointerLeave, () => {
                l()
            })
        })
    }, `SelectScrollButtonImpl`)),
    jc = `SelectBubbleInput`,
    Mc = a.forwardRef(Y(function({
        __scopeSelect: e,
        ...t
    }, n) {
        let r = Bs(jc, e),
            {
                value: i,
                onValueChange: o,
                required: s,
                disabled: c,
                name: l,
                autoComplete: u,
                form: d
            } = r,
            {
                nativeOptions: f,
                nativeSelectKey: p
            } = r,
            m = a.useRef(null),
            h = ps(n, m),
            g = i ?? ``,
            _ = zo(g),
            v = Array.from(f).some(e => (e.props.value ?? ``) === ``);
        return a.useEffect(() => {
            let e = m.current;
            if (!e) return;
            let t = window.HTMLSelectElement.prototype,
                n = Object.getOwnPropertyDescriptor(t, `value`).set;
            if (_ !== g && n) {
                let t = new Event(`change`, {
                    bubbles: !0
                });
                n.call(e, g), e.dispatchEvent(t)
            }
        }, [_, g]), (0, V.jsxs)(H.select, {
            "aria-hidden": !0,
            required: s,
            tabIndex: -1,
            name: l,
            autoComplete: u,
            disabled: c,
            form: d,
            onChange: e => o(e.target.value),
            ...t,
            style: {
                ...he,
                ...t.style
            },
            ref: h,
            defaultValue: g,
            children: [Pc(i) && !v ? (0, V.jsx)(`option`, {
                value: ``
            }) : null, Array.from(f)]
        }, p)
    }, `SelectBubbleInput`));

function Nc(e) {
    return typeof e == `function`
}
Y(Nc, `isFunction`);

function Pc(e) {
    return e === `` || e === void 0
}
Y(Pc, `shouldShowPlaceholder`);

function Fc(e) {
    let t = Ht(e),
        n = a.useRef(``),
        r = a.useRef(0),
        i = a.useCallback(e => {
            let i = n.current + e;
            t(i), Y((function e(t) {
                n.current = t, window.clearTimeout(r.current), t !== `` && (r.current = window.setTimeout(() => e(``), 1e3))
            }), `updateSearch`)(i)
        }, [t]),
        o = a.useCallback(() => {
            n.current = ``, window.clearTimeout(r.current)
        }, []);
    return a.useEffect(() => () => window.clearTimeout(r.current), []), [n, i, o]
}
Y(Fc, `useTypeaheadSearch`);

function Ic(e, t, n) {
    let r = t.length > 1 && Array.from(t).every(e => e === t[0]) ? t[0] : t,
        i = n ? e.indexOf(n) : -1,
        a = Lc(e, Math.max(i, 0));
    r.length === 1 && (a = a.filter(e => e !== n));
    let o = a.find(e => e.textValue.toLowerCase().startsWith(r.toLowerCase()));
    return o === n ? void 0 : o
}
Y(Ic, `findNextItem`);

function Lc(e, t) {
    return e.map((n, r) => e[(t + r) % e.length])
}
Y(Lc, `wrapArray`);

function Rc(e) {
    var t, n, r = ``;
    if (typeof e == `string` || typeof e == `number`) r += e;
    else if (typeof e == `object`)
        if (Array.isArray(e)) {
            var i = e.length;
            for (t = 0; t < i; t++) e[t] && (n = Rc(e[t])) && (r && (r += ` `), r += n)
        } else
            for (n in e) e[n] && (r && (r += ` `), r += n);
    return r
}

function zc() {
    for (var e, t, n = 0, r = ``, i = arguments.length; n < i; n++)(e = arguments[n]) && (t = Rc(e)) && (r && (r += ` `), r += t);
    return r
}
var Bc = (e, t) => {
        let n = Array(e.length + t.length);
        for (let t = 0; t < e.length; t++) n[t] = e[t];
        for (let r = 0; r < t.length; r++) n[e.length + r] = t[r];
        return n
    },
    Vc = (e, t) => ({
        classGroupId: e,
        validator: t
    }),
    Hc = (e = new Map, t = null, n) => ({
        nextPart: e,
        validators: t,
        classGroupId: n
    }),
    Uc = `-`,
    Wc = [],
    Gc = `arbitrary..`,
    Kc = e => {
        let t = Yc(e),
            {
                conflictingClassGroups: n,
                conflictingClassGroupModifiers: r
            } = e;
        return {
            getClassGroupId: e => {
                if (e.startsWith(`[`) && e.endsWith(`]`)) return Jc(e);
                let n = e.split(Uc);
                return qc(n, +(n[0] === `` && n.length > 1), t)
            },
            getConflictingClassGroupIds: (e, t) => {
                if (t) {
                    let t = r[e],
                        i = n[e];
                    return t ? i ? Bc(i, t) : t : i || Wc
                }
                return n[e] || Wc
            }
        }
    },
    qc = (e, t, n) => {
        if (e.length - t === 0) return n.classGroupId;
        let r = e[t],
            i = n.nextPart.get(r);
        if (i) {
            let n = qc(e, t + 1, i);
            if (n) return n
        }
        let a = n.validators;
        if (a === null) return;
        let o = t === 0 ? e.join(Uc) : e.slice(t).join(Uc),
            s = a.length;
        for (let e = 0; e < s; e++) {
            let t = a[e];
            if (t.validator(o)) return t.classGroupId
        }
    },
    Jc = e => e.slice(1, -1).indexOf(`:`) === -1 ? void 0 : (() => {
        let t = e.slice(1, -1),
            n = t.indexOf(`:`),
            r = t.slice(0, n);
        return r ? Gc + r : void 0
    })(),
    Yc = e => {
        let {
            theme: t,
            classGroups: n
        } = e;
        return Xc(n, t)
    },
    Xc = (e, t) => {
        let n = Hc();
        for (let r in e) {
            let i = e[r];
            Zc(i, n, r, t)
        }
        return n
    },
    Zc = (e, t, n, r) => {
        let i = e.length;
        for (let a = 0; a < i; a++) {
            let i = e[a];
            Qc(i, t, n, r)
        }
    },
    Qc = (e, t, n, r) => {
        if (typeof e == `string`) {
            $c(e, t, n);
            return
        }
        if (typeof e == `function`) {
            el(e, t, n, r);
            return
        }
        tl(e, t, n, r)
    },
    $c = (e, t, n) => {
        let r = e === `` ? t : nl(t, e);
        r.classGroupId = n
    },
    el = (e, t, n, r) => {
        if (rl(e)) {
            Zc(e(r), t, n, r);
            return
        }
        t.validators === null && (t.validators = []), t.validators.push(Vc(n, e))
    },
    tl = (e, t, n, r) => {
        let i = Object.entries(e),
            a = i.length;
        for (let e = 0; e < a; e++) {
            let [a, o] = i[e];
            Zc(o, nl(t, a), n, r)
        }
    },
    nl = (e, t) => {
        let n = e,
            r = t.split(Uc),
            i = r.length;
        for (let e = 0; e < i; e++) {
            let t = r[e],
                i = n.nextPart.get(t);
            i || (i = Hc(), n.nextPart.set(t, i)), n = i
        }
        return n
    },
    rl = e => `isThemeGetter` in e && e.isThemeGetter === !0,
    il = e => {
        if (e < 1) return {
            get: () => void 0,
            set: () => {}
        };
        let t = 0,
            n = Object.create(null),
            r = Object.create(null),
            i = (i, a) => {
                n[i] = a, t++, t > e && (t = 0, r = n, n = Object.create(null))
            };
        return {
            get(e) {
                let t = n[e];
                if (t !== void 0) return t;
                if ((t = r[e]) !== void 0) return i(e, t), t
            },
            set(e, t) {
                e in n ? n[e] = t : i(e, t)
            }
        }
    },
    al = `!`,
    ol = `:`,
    sl = [],
    cl = (e, t, n, r, i) => ({
        modifiers: e,
        hasImportantModifier: t,
        baseClassName: n,
        maybePostfixModifierPosition: r,
        isExternal: i
    }),
    ll = e => {
        let {
            prefix: t,
            experimentalParseClassName: n
        } = e, r = e => {
            let t = [],
                n = 0,
                r = 0,
                i = 0,
                a, o = e.length;
            for (let s = 0; s < o; s++) {
                let o = e[s];
                if (n === 0 && r === 0) {
                    if (o === ol) {
                        t.push(e.slice(i, s)), i = s + 1;
                        continue
                    }
                    if (o === `/`) {
                        a = s;
                        continue
                    }
                }
                o === `[` ? n++ : o === `]` ? n-- : o === `(` ? r++ : o === `)` && r--
            }
            let s = t.length === 0 ? e : e.slice(i),
                c = s,
                l = !1;
            s.endsWith(al) ? (c = s.slice(0, -1), l = !0) : s.startsWith(al) && (c = s.slice(1), l = !0);
            let u = a && a > i ? a - i : void 0;
            return cl(t, l, c, u)
        };
        if (t) {
            let e = t + ol,
                n = r;
            r = t => t.startsWith(e) ? n(t.slice(e.length)) : cl(sl, !1, t, void 0, !0)
        }
        if (n) {
            let e = r;
            r = t => n({
                className: t,
                parseClassName: e
            })
        }
        return r
    },
    ul = e => {
        let t = new Map;
        return e.orderSensitiveModifiers.forEach((e, n) => {
            t.set(e, 1e6 + n)
        }), e => {
            let n = [],
                r = [];
            for (let i = 0; i < e.length; i++) {
                let a = e[i],
                    o = a[0] === `[`,
                    s = t.has(a);
                o || s ? (r.length > 0 && (r.sort(), n.push(...r), r = []), n.push(a)) : r.push(a)
            }
            return r.length > 0 && (r.sort(), n.push(...r)), n
        }
    },
    dl = e => ({
        cache: il(e.cacheSize),
        parseClassName: ll(e),
        sortModifiers: ul(e),
        postfixLookupClassGroupIds: fl(e),
        ...Kc(e)
    }),
    fl = e => {
        let t = Object.create(null),
            n = e.postfixLookupClassGroups;
        if (n)
            for (let e = 0; e < n.length; e++) t[n[e]] = !0;
        return t
    },
    pl = /\s+/,
    ml = (e, t) => {
        let {
            parseClassName: n,
            getClassGroupId: r,
            getConflictingClassGroupIds: i,
            sortModifiers: a,
            postfixLookupClassGroupIds: o
        } = t, s = [], c = e.trim().split(pl), l = ``;
        for (let e = c.length - 1; e >= 0; --e) {
            let t = c[e],
                {
                    isExternal: u,
                    modifiers: d,
                    hasImportantModifier: f,
                    baseClassName: p,
                    maybePostfixModifierPosition: m
                } = n(t);
            if (u) {
                l = t + (l.length > 0 ? ` ` + l : l);
                continue
            }
            let h = !!m,
                g;
            if (h) {
                g = r(p.substring(0, m));
                let e = g && o[g] ? r(p) : void 0;
                e && e !== g && (g = e, h = !1)
            } else g = r(p);
            if (!g) {
                if (!h) {
                    l = t + (l.length > 0 ? ` ` + l : l);
                    continue
                }
                if (g = r(p), !g) {
                    l = t + (l.length > 0 ? ` ` + l : l);
                    continue
                }
                h = !1
            }
            let _ = d.length === 0 ? `` : d.length === 1 ? d[0] : a(d).join(`:`),
                v = f ? _ + al : _,
                y = v + g;
            if (s.indexOf(y) > -1) continue;
            s.push(y);
            let b = i(g, h);
            for (let e = 0; e < b.length; ++e) {
                let t = b[e];
                s.push(v + t)
            }
            l = t + (l.length > 0 ? ` ` + l : l)
        }
        return l
    },
    hl = (...e) => {
        let t = 0,
            n, r, i = ``;
        for (; t < e.length;)(n = e[t++]) && (r = gl(n)) && (i && (i += ` `), i += r);
        return i
    },
    gl = e => {
        if (typeof e == `string`) return e;
        let t, n = ``;
        for (let r = 0; r < e.length; r++) e[r] && (t = gl(e[r])) && (n && (n += ` `), n += t);
        return n
    },
    _l = (e, ...t) => {
        let n, r, i, a, o = o => (n = dl(t.reduce((e, t) => t(e), e())), r = n.cache.get, i = n.cache.set, a = s, s(o)),
            s = e => {
                let t = r(e);
                if (t) return t;
                let a = ml(e, n);
                return i(e, a), a
            };
        return a = o, (...e) => a(hl(...e))
    },
    vl = [],
    X = e => {
        let t = t => t[e] || vl;
        return t.isThemeGetter = !0, t
    },
    yl = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
    bl = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
    xl = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
    Sl = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
    Cl = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
    wl = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
    Tl = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
    El = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
    Dl = e => xl.test(e),
    Z = e => !!e && !Number.isNaN(Number(e)),
    Ol = e => !!e && Number.isInteger(Number(e)),
    kl = e => e.endsWith(`%`) && Z(e.slice(0, -1)),
    Al = e => Sl.test(e),
    jl = () => !0,
    Ml = e => Cl.test(e) && !wl.test(e),
    Nl = () => !1,
    Pl = e => Tl.test(e),
    Fl = e => El.test(e),
    Il = e => !Q(e) && !$(e),
    Ll = e => e.startsWith(`@container`) && (e[10] === `/` && e[11] !== void 0 || e[11] === `s` && e[16] !== void 0 && e.startsWith(`-size/`, 10) || e[11] === `n` && e[18] !== void 0 && e.startsWith(`-normal/`, 10)),
    Rl = e => $l(e, ru, Nl),
    Q = e => yl.test(e),
    zl = e => $l(e, iu, Ml),
    Bl = e => $l(e, au, Z),
    Vl = e => $l(e, su, jl),
    Hl = e => $l(e, ou, Nl),
    Ul = e => $l(e, tu, Nl),
    Wl = e => $l(e, nu, Fl),
    Gl = e => $l(e, cu, Pl),
    $ = e => bl.test(e),
    Kl = e => eu(e, iu),
    ql = e => eu(e, ou),
    Jl = e => eu(e, tu),
    Yl = e => eu(e, ru),
    Xl = e => eu(e, nu),
    Zl = e => eu(e, cu, !0),
    Ql = e => eu(e, su, !0),
    $l = (e, t, n) => {
        let r = yl.exec(e);
        return r ? r[1] ? t(r[1]) : n(r[2]) : !1
    },
    eu = (e, t, n = !1) => {
        let r = bl.exec(e);
        return r ? r[1] ? t(r[1]) : n : !1
    },
    tu = e => e === `position` || e === `percentage`,
    nu = e => e === `image` || e === `url`,
    ru = e => e === `length` || e === `size` || e === `bg-size`,
    iu = e => e === `length`,
    au = e => e === `number`,
    ou = e => e === `family-name`,
    su = e => e === `number` || e === `weight`,
    cu = e => e === `shadow`,
    lu = _l(() => {
        let e = X(`color`),
            t = X(`font`),
            n = X(`text`),
            r = X(`font-weight`),
            i = X(`tracking`),
            a = X(`leading`),
            o = X(`breakpoint`),
            s = X(`container`),
            c = X(`spacing`),
            l = X(`radius`),
            u = X(`shadow`),
            d = X(`inset-shadow`),
            f = X(`text-shadow`),
            p = X(`drop-shadow`),
            m = X(`blur`),
            h = X(`perspective`),
            g = X(`aspect`),
            _ = X(`ease`),
            v = X(`animate`),
            y = () => [`auto`, `avoid`, `all`, `avoid-page`, `page`, `left`, `right`, `column`],
            b = () => [`center`, `top`, `bottom`, `left`, `right`, `top-left`, `left-top`, `top-right`, `right-top`, `bottom-right`, `right-bottom`, `bottom-left`, `left-bottom`],
            x = () => [...b(), $, Q],
            S = () => [`auto`, `hidden`, `clip`, `visible`, `scroll`],
            C = () => [`auto`, `contain`, `none`],
            w = () => [$, Q, c],
            T = () => [Dl, `full`, `auto`, ...w()],
            E = () => [Ol, `none`, `subgrid`, $, Q],
            D = () => [`auto`, {
                span: [`full`, Ol, $, Q]
            }, Ol, $, Q],
            O = () => [Ol, `auto`, $, Q],
            k = () => [`auto`, `min`, `max`, `fr`, $, Q],
            A = () => [`start`, `end`, `center`, `between`, `around`, `evenly`, `stretch`, `baseline`, `center-safe`, `end-safe`],
            j = () => [`start`, `end`, `center`, `stretch`, `center-safe`, `end-safe`],
            M = () => [`auto`, ...w()],
            N = () => [Dl, `auto`, `full`, `dvw`, `dvh`, `lvw`, `lvh`, `svw`, `svh`, `min`, `max`, `fit`, ...w()],
            P = () => [Dl, `screen`, `full`, `dvw`, `lvw`, `svw`, `min`, `max`, `fit`, ...w()],
            F = () => [Dl, `screen`, `full`, `lh`, `dvh`, `lvh`, `svh`, `min`, `max`, `fit`, ...w()],
            I = () => [e, $, Q],
            ee = () => [...b(), Jl, Ul, {
                position: [$, Q]
            }],
            L = () => [`no-repeat`, {
                repeat: [``, `x`, `y`, `space`, `round`]
            }],
            te = () => [`auto`, `cover`, `contain`, Yl, Rl, {
                size: [$, Q]
            }],
            ne = () => [kl, Kl, zl],
            R = () => [``, `none`, `full`, l, $, Q],
            z = () => [``, Z, Kl, zl],
            re = () => [`solid`, `dashed`, `dotted`, `double`],
            ie = () => [`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`],
            B = () => [Z, kl, Jl, Ul],
            ae = () => [``, `none`, m, $, Q],
            oe = () => [`none`, Z, $, Q],
            se = () => [`none`, Z, $, Q],
            ce = () => [Z, $, Q],
            le = () => [Dl, `full`, ...w()];
        return {
            cacheSize: 500,
            theme: {
                animate: [`spin`, `ping`, `pulse`, `bounce`],
                aspect: [`video`],
                blur: [Al],
                breakpoint: [Al],
                color: [jl],
                container: [Al],
                "drop-shadow": [Al],
                ease: [`in`, `out`, `in-out`],
                font: [Il],
                "font-weight": [`thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black`],
                "inset-shadow": [Al],
                leading: [`none`, `tight`, `snug`, `normal`, `relaxed`, `loose`],
                perspective: [`dramatic`, `near`, `normal`, `midrange`, `distant`, `none`],
                radius: [Al],
                shadow: [Al],
                spacing: [`px`, Z],
                text: [Al],
                "text-shadow": [Al],
                tracking: [`tighter`, `tight`, `normal`, `wide`, `wider`, `widest`]
            },
            classGroups: {
                aspect: [{
                    aspect: [`auto`, `square`, Dl, Q, $, g]
                }],
                container: [`container`],
                "container-type": [{
                    "@container": [``, `normal`, `size`, $, Q]
                }],
                "container-named": [Ll],
                columns: [{
                    columns: [Z, Q, $, s]
                }],
                "break-after": [{
                    "break-after": y()
                }],
                "break-before": [{
                    "break-before": y()
                }],
                "break-inside": [{
                    "break-inside": [`auto`, `avoid`, `avoid-page`, `avoid-column`]
                }],
                "box-decoration": [{
                    "box-decoration": [`slice`, `clone`]
                }],
                box: [{
                    box: [`border`, `content`]
                }],
                display: [`block`, `inline-block`, `inline`, `flex`, `inline-flex`, `table`, `inline-table`, `table-caption`, `table-cell`, `table-column`, `table-column-group`, `table-footer-group`, `table-header-group`, `table-row-group`, `table-row`, `flow-root`, `grid`, `inline-grid`, `contents`, `list-item`, `hidden`],
                sr: [`sr-only`, `not-sr-only`],
                float: [{
                    float: [`right`, `left`, `none`, `start`, `end`]
                }],
                clear: [{
                    clear: [`left`, `right`, `both`, `none`, `start`, `end`]
                }],
                isolation: [`isolate`, `isolation-auto`],
                "object-fit": [{
                    object: [`contain`, `cover`, `fill`, `none`, `scale-down`]
                }],
                "object-position": [{
                    object: x()
                }],
                overflow: [{
                    overflow: S()
                }],
                "overflow-x": [{
                    "overflow-x": S()
                }],
                "overflow-y": [{
                    "overflow-y": S()
                }],
                overscroll: [{
                    overscroll: C()
                }],
                "overscroll-x": [{
                    "overscroll-x": C()
                }],
                "overscroll-y": [{
                    "overscroll-y": C()
                }],
                position: [`static`, `fixed`, `absolute`, `relative`, `sticky`],
                inset: [{
                    inset: T()
                }],
                "inset-x": [{
                    "inset-x": T()
                }],
                "inset-y": [{
                    "inset-y": T()
                }],
                start: [{
                    "inset-s": T(),
                    start: T()
                }],
                end: [{
                    "inset-e": T(),
                    end: T()
                }],
                "inset-bs": [{
                    "inset-bs": T()
                }],
                "inset-be": [{
                    "inset-be": T()
                }],
                top: [{
                    top: T()
                }],
                right: [{
                    right: T()
                }],
                bottom: [{
                    bottom: T()
                }],
                left: [{
                    left: T()
                }],
                visibility: [`visible`, `invisible`, `collapse`],
                z: [{
                    z: [Ol, `auto`, $, Q]
                }],
                basis: [{
                    basis: [Dl, `full`, `auto`, s, ...w()]
                }],
                "flex-direction": [{
                    flex: [`row`, `row-reverse`, `col`, `col-reverse`]
                }],
                "flex-wrap": [{
                    flex: [`nowrap`, `wrap`, `wrap-reverse`]
                }],
                flex: [{
                    flex: [Z, Dl, `auto`, `initial`, `none`, Q]
                }],
                grow: [{
                    grow: [``, Z, $, Q]
                }],
                shrink: [{
                    shrink: [``, Z, $, Q]
                }],
                order: [{
                    order: [Ol, `first`, `last`, `none`, $, Q]
                }],
                "grid-cols": [{
                    "grid-cols": E()
                }],
                "col-start-end": [{
                    col: D()
                }],
                "col-start": [{
                    "col-start": O()
                }],
                "col-end": [{
                    "col-end": O()
                }],
                "grid-rows": [{
                    "grid-rows": E()
                }],
                "row-start-end": [{
                    row: D()
                }],
                "row-start": [{
                    "row-start": O()
                }],
                "row-end": [{
                    "row-end": O()
                }],
                "grid-flow": [{
                    "grid-flow": [`row`, `col`, `dense`, `row-dense`, `col-dense`]
                }],
                "auto-cols": [{
                    "auto-cols": k()
                }],
                "auto-rows": [{
                    "auto-rows": k()
                }],
                gap: [{
                    gap: w()
                }],
                "gap-x": [{
                    "gap-x": w()
                }],
                "gap-y": [{
                    "gap-y": w()
                }],
                "justify-content": [{
                    justify: [...A(), `normal`]
                }],
                "justify-items": [{
                    "justify-items": [...j(), `normal`]
                }],
                "justify-self": [{
                    "justify-self": [`auto`, ...j()]
                }],
                "align-content": [{
                    content: [`normal`, ...A()]
                }],
                "align-items": [{
                    items: [...j(), {
                        baseline: [``, `last`]
                    }]
                }],
                "align-self": [{
                    self: [`auto`, ...j(), {
                        baseline: [``, `last`]
                    }]
                }],
                "place-content": [{
                    "place-content": A()
                }],
                "place-items": [{
                    "place-items": [...j(), `baseline`]
                }],
                "place-self": [{
                    "place-self": [`auto`, ...j()]
                }],
                p: [{
                    p: w()
                }],
                px: [{
                    px: w()
                }],
                py: [{
                    py: w()
                }],
                ps: [{
                    ps: w()
                }],
                pe: [{
                    pe: w()
                }],
                pbs: [{
                    pbs: w()
                }],
                pbe: [{
                    pbe: w()
                }],
                pt: [{
                    pt: w()
                }],
                pr: [{
                    pr: w()
                }],
                pb: [{
                    pb: w()
                }],
                pl: [{
                    pl: w()
                }],
                m: [{
                    m: M()
                }],
                mx: [{
                    mx: M()
                }],
                my: [{
                    my: M()
                }],
                ms: [{
                    ms: M()
                }],
                me: [{
                    me: M()
                }],
                mbs: [{
                    mbs: M()
                }],
                mbe: [{
                    mbe: M()
                }],
                mt: [{
                    mt: M()
                }],
                mr: [{
                    mr: M()
                }],
                mb: [{
                    mb: M()
                }],
                ml: [{
                    ml: M()
                }],
                "space-x": [{
                    "space-x": w()
                }],
                "space-x-reverse": [`space-x-reverse`],
                "space-y": [{
                    "space-y": w()
                }],
                "space-y-reverse": [`space-y-reverse`],
                size: [{
                    size: N()
                }],
                "inline-size": [{
                    inline: [`auto`, ...P()]
                }],
                "min-inline-size": [{
                    "min-inline": [`auto`, ...P()]
                }],
                "max-inline-size": [{
                    "max-inline": [`none`, ...P()]
                }],
                "block-size": [{
                    block: [`auto`, ...F()]
                }],
                "min-block-size": [{
                    "min-block": [`auto`, ...F()]
                }],
                "max-block-size": [{
                    "max-block": [`none`, ...F()]
                }],
                w: [{
                    w: [s, `screen`, ...N()]
                }],
                "min-w": [{
                    "min-w": [s, `screen`, `none`, ...N()]
                }],
                "max-w": [{
                    "max-w": [s, `screen`, `none`, `prose`, {
                        screen: [o]
                    }, ...N()]
                }],
                h: [{
                    h: [`screen`, `lh`, ...N()]
                }],
                "min-h": [{
                    "min-h": [`screen`, `lh`, `none`, ...N()]
                }],
                "max-h": [{
                    "max-h": [`screen`, `lh`, ...N()]
                }],
                "font-size": [{
                    text: [`base`, n, Kl, zl]
                }],
                "font-smoothing": [`antialiased`, `subpixel-antialiased`],
                "font-style": [`italic`, `not-italic`],
                "font-weight": [{
                    font: [r, Ql, Vl]
                }],
                "font-stretch": [{
                    "font-stretch": [`ultra-condensed`, `extra-condensed`, `condensed`, `semi-condensed`, `normal`, `semi-expanded`, `expanded`, `extra-expanded`, `ultra-expanded`, kl, Q]
                }],
                "font-family": [{
                    font: [ql, Hl, t]
                }],
                "font-features": [{
                    "font-features": [Q]
                }],
                "fvn-normal": [`normal-nums`],
                "fvn-ordinal": [`ordinal`],
                "fvn-slashed-zero": [`slashed-zero`],
                "fvn-figure": [`lining-nums`, `oldstyle-nums`],
                "fvn-spacing": [`proportional-nums`, `tabular-nums`],
                "fvn-fraction": [`diagonal-fractions`, `stacked-fractions`],
                tracking: [{
                    tracking: [i, $, Q]
                }],
                "line-clamp": [{
                    "line-clamp": [Z, `none`, $, Bl]
                }],
                leading: [{
                    leading: [a, ...w()]
                }],
                "list-image": [{
                    "list-image": [`none`, $, Q]
                }],
                "list-style-position": [{
                    list: [`inside`, `outside`]
                }],
                "list-style-type": [{
                    list: [`disc`, `decimal`, `none`, $, Q]
                }],
                "text-alignment": [{
                    text: [`left`, `center`, `right`, `justify`, `start`, `end`]
                }],
                "placeholder-color": [{
                    placeholder: I()
                }],
                "text-color": [{
                    text: I()
                }],
                "text-decoration": [`underline`, `overline`, `line-through`, `no-underline`],
                "text-decoration-style": [{
                    decoration: [...re(), `wavy`]
                }],
                "text-decoration-thickness": [{
                    decoration: [Z, `from-font`, `auto`, $, zl]
                }],
                "text-decoration-color": [{
                    decoration: I()
                }],
                "underline-offset": [{
                    "underline-offset": [Z, `auto`, $, Q]
                }],
                "text-transform": [`uppercase`, `lowercase`, `capitalize`, `normal-case`],
                "text-overflow": [`truncate`, `text-ellipsis`, `text-clip`],
                "text-wrap": [{
                    text: [`wrap`, `nowrap`, `balance`, `pretty`]
                }],
                indent: [{
                    indent: w()
                }],
                "tab-size": [{
                    tab: [Ol, $, Q]
                }],
                "vertical-align": [{
                    align: [`baseline`, `top`, `middle`, `bottom`, `text-top`, `text-bottom`, `sub`, `super`, $, Q]
                }],
                whitespace: [{
                    whitespace: [`normal`, `nowrap`, `pre`, `pre-line`, `pre-wrap`, `break-spaces`]
                }],
                break: [{
                    break: [`normal`, `words`, `all`, `keep`]
                }],
                wrap: [{
                    wrap: [`break-word`, `anywhere`, `normal`]
                }],
                hyphens: [{
                    hyphens: [`none`, `manual`, `auto`]
                }],
                content: [{
                    content: [`none`, $, Q]
                }],
                "bg-attachment": [{
                    bg: [`fixed`, `local`, `scroll`]
                }],
                "bg-clip": [{
                    "bg-clip": [`border`, `padding`, `content`, `text`]
                }],
                "bg-origin": [{
                    "bg-origin": [`border`, `padding`, `content`]
                }],
                "bg-position": [{
                    bg: ee()
                }],
                "bg-repeat": [{
                    bg: L()
                }],
                "bg-size": [{
                    bg: te()
                }],
                "bg-image": [{
                    bg: [`none`, {
                        linear: [{
                            to: [`t`, `tr`, `r`, `br`, `b`, `bl`, `l`, `tl`]
                        }, Ol, $, Q],
                        radial: [``, $, Q],
                        conic: [Ol, $, Q]
                    }, Xl, Wl]
                }],
                "bg-color": [{
                    bg: I()
                }],
                "gradient-from-pos": [{
                    from: ne()
                }],
                "gradient-via-pos": [{
                    via: ne()
                }],
                "gradient-to-pos": [{
                    to: ne()
                }],
                "gradient-from": [{
                    from: I()
                }],
                "gradient-via": [{
                    via: I()
                }],
                "gradient-to": [{
                    to: I()
                }],
                rounded: [{
                    rounded: R()
                }],
                "rounded-s": [{
                    "rounded-s": R()
                }],
                "rounded-e": [{
                    "rounded-e": R()
                }],
                "rounded-t": [{
                    "rounded-t": R()
                }],
                "rounded-r": [{
                    "rounded-r": R()
                }],
                "rounded-b": [{
                    "rounded-b": R()
                }],
                "rounded-l": [{
                    "rounded-l": R()
                }],
                "rounded-ss": [{
                    "rounded-ss": R()
                }],
                "rounded-se": [{
                    "rounded-se": R()
                }],
                "rounded-ee": [{
                    "rounded-ee": R()
                }],
                "rounded-es": [{
                    "rounded-es": R()
                }],
                "rounded-tl": [{
                    "rounded-tl": R()
                }],
                "rounded-tr": [{
                    "rounded-tr": R()
                }],
                "rounded-br": [{
                    "rounded-br": R()
                }],
                "rounded-bl": [{
                    "rounded-bl": R()
                }],
                "border-w": [{
                    border: z()
                }],
                "border-w-x": [{
                    "border-x": z()
                }],
                "border-w-y": [{
                    "border-y": z()
                }],
                "border-w-s": [{
                    "border-s": z()
                }],
                "border-w-e": [{
                    "border-e": z()
                }],
                "border-w-bs": [{
                    "border-bs": z()
                }],
                "border-w-be": [{
                    "border-be": z()
                }],
                "border-w-t": [{
                    "border-t": z()
                }],
                "border-w-r": [{
                    "border-r": z()
                }],
                "border-w-b": [{
                    "border-b": z()
                }],
                "border-w-l": [{
                    "border-l": z()
                }],
                "divide-x": [{
                    "divide-x": z()
                }],
                "divide-x-reverse": [`divide-x-reverse`],
                "divide-y": [{
                    "divide-y": z()
                }],
                "divide-y-reverse": [`divide-y-reverse`],
                "border-style": [{
                    border: [...re(), `hidden`, `none`]
                }],
                "divide-style": [{
                    divide: [...re(), `hidden`, `none`]
                }],
                "border-color": [{
                    border: I()
                }],
                "border-color-x": [{
                    "border-x": I()
                }],
                "border-color-y": [{
                    "border-y": I()
                }],
                "border-color-s": [{
                    "border-s": I()
                }],
                "border-color-e": [{
                    "border-e": I()
                }],
                "border-color-bs": [{
                    "border-bs": I()
                }],
                "border-color-be": [{
                    "border-be": I()
                }],
                "border-color-t": [{
                    "border-t": I()
                }],
                "border-color-r": [{
                    "border-r": I()
                }],
                "border-color-b": [{
                    "border-b": I()
                }],
                "border-color-l": [{
                    "border-l": I()
                }],
                "divide-color": [{
                    divide: I()
                }],
                "outline-style": [{
                    outline: [...re(), `none`, `hidden`]
                }],
                "outline-offset": [{
                    "outline-offset": [Z, $, Q]
                }],
                "outline-w": [{
                    outline: [``, Z, Kl, zl]
                }],
                "outline-color": [{
                    outline: I()
                }],
                shadow: [{
                    shadow: [``, `none`, u, Zl, Gl]
                }],
                "shadow-color": [{
                    shadow: I()
                }],
                "inset-shadow": [{
                    "inset-shadow": [`none`, d, Zl, Gl]
                }],
                "inset-shadow-color": [{
                    "inset-shadow": I()
                }],
                "ring-w": [{
                    ring: z()
                }],
                "ring-w-inset": [`ring-inset`],
                "ring-color": [{
                    ring: I()
                }],
                "ring-offset-w": [{
                    "ring-offset": [Z, zl]
                }],
                "ring-offset-color": [{
                    "ring-offset": I()
                }],
                "inset-ring-w": [{
                    "inset-ring": z()
                }],
                "inset-ring-color": [{
                    "inset-ring": I()
                }],
                "text-shadow": [{
                    "text-shadow": [`none`, f, Zl, Gl]
                }],
                "text-shadow-color": [{
                    "text-shadow": I()
                }],
                opacity: [{
                    opacity: [Z, $, Q]
                }],
                "mix-blend": [{
                    "mix-blend": [...ie(), `plus-darker`, `plus-lighter`]
                }],
                "bg-blend": [{
                    "bg-blend": ie()
                }],
                "mask-clip": [{
                    "mask-clip": [`border`, `padding`, `content`, `fill`, `stroke`, `view`]
                }, `mask-no-clip`],
                "mask-composite": [{
                    mask: [`add`, `subtract`, `intersect`, `exclude`]
                }],
                "mask-image-linear-pos": [{
                    "mask-linear": [Z]
                }],
                "mask-image-linear-from-pos": [{
                    "mask-linear-from": B()
                }],
                "mask-image-linear-to-pos": [{
                    "mask-linear-to": B()
                }],
                "mask-image-linear-from-color": [{
                    "mask-linear-from": I()
                }],
                "mask-image-linear-to-color": [{
                    "mask-linear-to": I()
                }],
                "mask-image-t-from-pos": [{
                    "mask-t-from": B()
                }],
                "mask-image-t-to-pos": [{
                    "mask-t-to": B()
                }],
                "mask-image-t-from-color": [{
                    "mask-t-from": I()
                }],
                "mask-image-t-to-color": [{
                    "mask-t-to": I()
                }],
                "mask-image-r-from-pos": [{
                    "mask-r-from": B()
                }],
                "mask-image-r-to-pos": [{
                    "mask-r-to": B()
                }],
                "mask-image-r-from-color": [{
                    "mask-r-from": I()
                }],
                "mask-image-r-to-color": [{
                    "mask-r-to": I()
                }],
                "mask-image-b-from-pos": [{
                    "mask-b-from": B()
                }],
                "mask-image-b-to-pos": [{
                    "mask-b-to": B()
                }],
                "mask-image-b-from-color": [{
                    "mask-b-from": I()
                }],
                "mask-image-b-to-color": [{
                    "mask-b-to": I()
                }],
                "mask-image-l-from-pos": [{
                    "mask-l-from": B()
                }],
                "mask-image-l-to-pos": [{
                    "mask-l-to": B()
                }],
                "mask-image-l-from-color": [{
                    "mask-l-from": I()
                }],
                "mask-image-l-to-color": [{
                    "mask-l-to": I()
                }],
                "mask-image-x-from-pos": [{
                    "mask-x-from": B()
                }],
                "mask-image-x-to-pos": [{
                    "mask-x-to": B()
                }],
                "mask-image-x-from-color": [{
                    "mask-x-from": I()
                }],
                "mask-image-x-to-color": [{
                    "mask-x-to": I()
                }],
                "mask-image-y-from-pos": [{
                    "mask-y-from": B()
                }],
                "mask-image-y-to-pos": [{
                    "mask-y-to": B()
                }],
                "mask-image-y-from-color": [{
                    "mask-y-from": I()
                }],
                "mask-image-y-to-color": [{
                    "mask-y-to": I()
                }],
                "mask-image-radial": [{
                    "mask-radial": [$, Q]
                }],
                "mask-image-radial-from-pos": [{
                    "mask-radial-from": B()
                }],
                "mask-image-radial-to-pos": [{
                    "mask-radial-to": B()
                }],
                "mask-image-radial-from-color": [{
                    "mask-radial-from": I()
                }],
                "mask-image-radial-to-color": [{
                    "mask-radial-to": I()
                }],
                "mask-image-radial-shape": [{
                    "mask-radial": [`circle`, `ellipse`]
                }],
                "mask-image-radial-size": [{
                    "mask-radial": [{
                        closest: [`side`, `corner`],
                        farthest: [`side`, `corner`]
                    }]
                }],
                "mask-image-radial-pos": [{
                    "mask-radial-at": b()
                }],
                "mask-image-conic-pos": [{
                    "mask-conic": [Z]
                }],
                "mask-image-conic-from-pos": [{
                    "mask-conic-from": B()
                }],
                "mask-image-conic-to-pos": [{
                    "mask-conic-to": B()
                }],
                "mask-image-conic-from-color": [{
                    "mask-conic-from": I()
                }],
                "mask-image-conic-to-color": [{
                    "mask-conic-to": I()
                }],
                "mask-mode": [{
                    mask: [`alpha`, `luminance`, `match`]
                }],
                "mask-origin": [{
                    "mask-origin": [`border`, `padding`, `content`, `fill`, `stroke`, `view`]
                }],
                "mask-position": [{
                    mask: ee()
                }],
                "mask-repeat": [{
                    mask: L()
                }],
                "mask-size": [{
                    mask: te()
                }],
                "mask-type": [{
                    "mask-type": [`alpha`, `luminance`]
                }],
                "mask-image": [{
                    mask: [`none`, $, Q]
                }],
                filter: [{
                    filter: [``, `none`, $, Q]
                }],
                blur: [{
                    blur: ae()
                }],
                brightness: [{
                    brightness: [Z, $, Q]
                }],
                contrast: [{
                    contrast: [Z, $, Q]
                }],
                "drop-shadow": [{
                    "drop-shadow": [``, `none`, p, Zl, Gl]
                }],
                "drop-shadow-color": [{
                    "drop-shadow": I()
                }],
                grayscale: [{
                    grayscale: [``, Z, $, Q]
                }],
                "hue-rotate": [{
                    "hue-rotate": [Z, $, Q]
                }],
                invert: [{
                    invert: [``, Z, $, Q]
                }],
                saturate: [{
                    saturate: [Z, $, Q]
                }],
                sepia: [{
                    sepia: [``, Z, $, Q]
                }],
                "backdrop-filter": [{
                    "backdrop-filter": [``, `none`, $, Q]
                }],
                "backdrop-blur": [{
                    "backdrop-blur": ae()
                }],
                "backdrop-brightness": [{
                    "backdrop-brightness": [Z, $, Q]
                }],
                "backdrop-contrast": [{
                    "backdrop-contrast": [Z, $, Q]
                }],
                "backdrop-grayscale": [{
                    "backdrop-grayscale": [``, Z, $, Q]
                }],
                "backdrop-hue-rotate": [{
                    "backdrop-hue-rotate": [Z, $, Q]
                }],
                "backdrop-invert": [{
                    "backdrop-invert": [``, Z, $, Q]
                }],
                "backdrop-opacity": [{
                    "backdrop-opacity": [Z, $, Q]
                }],
                "backdrop-saturate": [{
                    "backdrop-saturate": [Z, $, Q]
                }],
                "backdrop-sepia": [{
                    "backdrop-sepia": [``, Z, $, Q]
                }],
                "border-collapse": [{
                    border: [`collapse`, `separate`]
                }],
                "border-spacing": [{
                    "border-spacing": w()
                }],
                "border-spacing-x": [{
                    "border-spacing-x": w()
                }],
                "border-spacing-y": [{
                    "border-spacing-y": w()
                }],
                "table-layout": [{
                    table: [`auto`, `fixed`]
                }],
                caption: [{
                    caption: [`top`, `bottom`]
                }],
                transition: [{
                    transition: [``, `all`, `colors`, `opacity`, `shadow`, `transform`, `none`, $, Q]
                }],
                "transition-behavior": [{
                    transition: [`normal`, `discrete`]
                }],
                duration: [{
                    duration: [Z, `initial`, $, Q]
                }],
                ease: [{
                    ease: [`linear`, `initial`, _, $, Q]
                }],
                delay: [{
                    delay: [Z, $, Q]
                }],
                animate: [{
                    animate: [`none`, v, $, Q]
                }],
                backface: [{
                    backface: [`hidden`, `visible`]
                }],
                perspective: [{
                    perspective: [h, $, Q]
                }],
                "perspective-origin": [{
                    "perspective-origin": x()
                }],
                rotate: [{
                    rotate: oe()
                }],
                "rotate-x": [{
                    "rotate-x": oe()
                }],
                "rotate-y": [{
                    "rotate-y": oe()
                }],
                "rotate-z": [{
                    "rotate-z": oe()
                }],
                scale: [{
                    scale: se()
                }],
                "scale-x": [{
                    "scale-x": se()
                }],
                "scale-y": [{
                    "scale-y": se()
                }],
                "scale-z": [{
                    "scale-z": se()
                }],
                "scale-3d": [`scale-3d`],
                skew: [{
                    skew: ce()
                }],
                "skew-x": [{
                    "skew-x": ce()
                }],
                "skew-y": [{
                    "skew-y": ce()
                }],
                transform: [{
                    transform: [$, Q, ``, `none`, `gpu`, `cpu`]
                }],
                "transform-origin": [{
                    origin: x()
                }],
                "transform-style": [{
                    transform: [`3d`, `flat`]
                }],
                translate: [{
                    translate: le()
                }],
                "translate-x": [{
                    "translate-x": le()
                }],
                "translate-y": [{
                    "translate-y": le()
                }],
                "translate-z": [{
                    "translate-z": le()
                }],
                "translate-none": [`translate-none`],
                zoom: [{
                    zoom: [Ol, $, Q]
                }],
                accent: [{
                    accent: I()
                }],
                appearance: [{
                    appearance: [`none`, `auto`]
                }],
                "caret-color": [{
                    caret: I()
                }],
                "color-scheme": [{
                    scheme: [`normal`, `dark`, `light`, `light-dark`, `only-dark`, `only-light`]
                }],
                cursor: [{
                    cursor: [`auto`, `default`, `pointer`, `wait`, `text`, `move`, `help`, `not-allowed`, `none`, `context-menu`, `progress`, `cell`, `crosshair`, `vertical-text`, `alias`, `copy`, `no-drop`, `grab`, `grabbing`, `all-scroll`, `col-resize`, `row-resize`, `n-resize`, `e-resize`, `s-resize`, `w-resize`, `ne-resize`, `nw-resize`, `se-resize`, `sw-resize`, `ew-resize`, `ns-resize`, `nesw-resize`, `nwse-resize`, `zoom-in`, `zoom-out`, $, Q]
                }],
                "field-sizing": [{
                    "field-sizing": [`fixed`, `content`]
                }],
                "pointer-events": [{
                    "pointer-events": [`auto`, `none`]
                }],
                resize: [{
                    resize: [`none`, ``, `y`, `x`]
                }],
                "scroll-behavior": [{
                    scroll: [`auto`, `smooth`]
                }],
                "scrollbar-thumb-color": [{
                    "scrollbar-thumb": I()
                }],
                "scrollbar-track-color": [{
                    "scrollbar-track": I()
                }],
                "scrollbar-gutter": [{
                    "scrollbar-gutter": [`auto`, `stable`, `both`]
                }],
                "scrollbar-w": [{
                    scrollbar: [`auto`, `thin`, `none`]
                }],
                "scroll-m": [{
                    "scroll-m": w()
                }],
                "scroll-mx": [{
                    "scroll-mx": w()
                }],
                "scroll-my": [{
                    "scroll-my": w()
                }],
                "scroll-ms": [{
                    "scroll-ms": w()
                }],
                "scroll-me": [{
                    "scroll-me": w()
                }],
                "scroll-mbs": [{
                    "scroll-mbs": w()
                }],
                "scroll-mbe": [{
                    "scroll-mbe": w()
                }],
                "scroll-mt": [{
                    "scroll-mt": w()
                }],
                "scroll-mr": [{
                    "scroll-mr": w()
                }],
                "scroll-mb": [{
                    "scroll-mb": w()
                }],
                "scroll-ml": [{
                    "scroll-ml": w()
                }],
                "scroll-p": [{
                    "scroll-p": w()
                }],
                "scroll-px": [{
                    "scroll-px": w()
                }],
                "scroll-py": [{
                    "scroll-py": w()
                }],
                "scroll-ps": [{
                    "scroll-ps": w()
                }],
                "scroll-pe": [{
                    "scroll-pe": w()
                }],
                "scroll-pbs": [{
                    "scroll-pbs": w()
                }],
                "scroll-pbe": [{
                    "scroll-pbe": w()
                }],
                "scroll-pt": [{
                    "scroll-pt": w()
                }],
                "scroll-pr": [{
                    "scroll-pr": w()
                }],
                "scroll-pb": [{
                    "scroll-pb": w()
                }],
                "scroll-pl": [{
                    "scroll-pl": w()
                }],
                "snap-align": [{
                    snap: [`start`, `end`, `center`, `align-none`]
                }],
                "snap-stop": [{
                    snap: [`normal`, `always`]
                }],
                "snap-type": [{
                    snap: [`none`, `x`, `y`, `both`]
                }],
                "snap-strictness": [{
                    snap: [`mandatory`, `proximity`]
                }],
                touch: [{
                    touch: [`auto`, `none`, `manipulation`]
                }],
                "touch-x": [{
                    "touch-pan": [`x`, `left`, `right`]
                }],
                "touch-y": [{
                    "touch-pan": [`y`, `up`, `down`]
                }],
                "touch-pz": [`touch-pinch-zoom`],
                select: [{
                    select: [`none`, `text`, `all`, `auto`]
                }],
                "will-change": [{
                    "will-change": [`auto`, `scroll`, `contents`, `transform`, $, Q]
                }],
                fill: [{
                    fill: [`none`, ...I()]
                }],
                "stroke-w": [{
                    stroke: [Z, Kl, zl, Bl]
                }],
                stroke: [{
                    stroke: [`none`, ...I()]
                }],
                "forced-color-adjust": [{
                    "forced-color-adjust": [`auto`, `none`]
                }]
            },
            conflictingClassGroups: {
                "container-named": [`container-type`],
                overflow: [`overflow-x`, `overflow-y`],
                overscroll: [`overscroll-x`, `overscroll-y`],
                inset: [`inset-x`, `inset-y`, `inset-bs`, `inset-be`, `start`, `end`, `top`, `right`, `bottom`, `left`],
                "inset-x": [`right`, `left`],
                "inset-y": [`top`, `bottom`],
                flex: [`basis`, `grow`, `shrink`],
                gap: [`gap-x`, `gap-y`],
                p: [`px`, `py`, `ps`, `pe`, `pbs`, `pbe`, `pt`, `pr`, `pb`, `pl`],
                px: [`pr`, `pl`],
                py: [`pt`, `pb`],
                m: [`mx`, `my`, `ms`, `me`, `mbs`, `mbe`, `mt`, `mr`, `mb`, `ml`],
                mx: [`mr`, `ml`],
                my: [`mt`, `mb`],
                size: [`w`, `h`],
                "font-size": [`leading`],
                "fvn-normal": [`fvn-ordinal`, `fvn-slashed-zero`, `fvn-figure`, `fvn-spacing`, `fvn-fraction`],
                "fvn-ordinal": [`fvn-normal`],
                "fvn-slashed-zero": [`fvn-normal`],
                "fvn-figure": [`fvn-normal`],
                "fvn-spacing": [`fvn-normal`],
                "fvn-fraction": [`fvn-normal`],
                "line-clamp": [`display`, `overflow`],
                rounded: [`rounded-s`, `rounded-e`, `rounded-t`, `rounded-r`, `rounded-b`, `rounded-l`, `rounded-ss`, `rounded-se`, `rounded-ee`, `rounded-es`, `rounded-tl`, `rounded-tr`, `rounded-br`, `rounded-bl`],
                "rounded-s": [`rounded-ss`, `rounded-es`],
                "rounded-e": [`rounded-se`, `rounded-ee`],
                "rounded-t": [`rounded-tl`, `rounded-tr`],
                "rounded-r": [`rounded-tr`, `rounded-br`],
                "rounded-b": [`rounded-br`, `rounded-bl`],
                "rounded-l": [`rounded-tl`, `rounded-bl`],
                "border-spacing": [`border-spacing-x`, `border-spacing-y`],
                "border-w": [`border-w-x`, `border-w-y`, `border-w-s`, `border-w-e`, `border-w-bs`, `border-w-be`, `border-w-t`, `border-w-r`, `border-w-b`, `border-w-l`],
                "border-w-x": [`border-w-r`, `border-w-l`],
                "border-w-y": [`border-w-t`, `border-w-b`],
                "border-color": [`border-color-x`, `border-color-y`, `border-color-s`, `border-color-e`, `border-color-bs`, `border-color-be`, `border-color-t`, `border-color-r`, `border-color-b`, `border-color-l`],
                "border-color-x": [`border-color-r`, `border-color-l`],
                "border-color-y": [`border-color-t`, `border-color-b`],
                translate: [`translate-x`, `translate-y`, `translate-none`],
                "translate-none": [`translate`, `translate-x`, `translate-y`, `translate-z`],
                "scroll-m": [`scroll-mx`, `scroll-my`, `scroll-ms`, `scroll-me`, `scroll-mbs`, `scroll-mbe`, `scroll-mt`, `scroll-mr`, `scroll-mb`, `scroll-ml`],
                "scroll-mx": [`scroll-mr`, `scroll-ml`],
                "scroll-my": [`scroll-mt`, `scroll-mb`],
                "scroll-p": [`scroll-px`, `scroll-py`, `scroll-ps`, `scroll-pe`, `scroll-pbs`, `scroll-pbe`, `scroll-pt`, `scroll-pr`, `scroll-pb`, `scroll-pl`],
                "scroll-px": [`scroll-pr`, `scroll-pl`],
                "scroll-py": [`scroll-pt`, `scroll-pb`],
                touch: [`touch-x`, `touch-y`, `touch-pz`],
                "touch-x": [`touch`],
                "touch-y": [`touch`],
                "touch-pz": [`touch`]
            },
            conflictingClassGroupModifiers: {
                "font-size": [`leading`]
            },
            postfixLookupClassGroups: [`container-type`],
            orderSensitiveModifiers: [`*`, `**`, `after`, `backdrop`, `before`, `details-content`, `file`, `first-letter`, `first-line`, `marker`, `placeholder`, `selection`]
        }
    });

function uu(...e) {
    return lu(zc(e))
}

function du({
    className: e,
    value: t,
    ...n
}) {
    return (0, V.jsx)(ss, {
        "data-slot": `progress`,
        value: t,
        className: uu(`relative h-2 w-full overflow-hidden rounded-full bg-primary/20`, e),
        ...n,
        children: (0, V.jsx)(cs, {
            "data-slot": `progress-indicator`,
            className: `h-full w-full flex-1 bg-primary transition-all`,
            style: {
                transform: `translateX(-${100-(t??0)}%)`
            }
        })
    })
}

function fu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`div`, {
        "data-slot": `table-container`,
        className: `relative w-full overflow-x-auto`,
        children: (0, V.jsx)(`table`, {
            "data-slot": `table`,
            className: uu(`w-full caption-bottom text-sm`, e),
            ...t
        })
    })
}

function pu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`thead`, {
        "data-slot": `table-header`,
        className: uu(`[&_tr]:border-b`, e),
        ...t
    })
}

function mu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`tbody`, {
        "data-slot": `table-body`,
        className: uu(`[&_tr:last-child]:border-0`, e),
        ...t
    })
}

function hu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`tr`, {
        "data-slot": `table-row`,
        className: uu(`border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted`, e),
        ...t
    })
}

function gu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`th`, {
        "data-slot": `table-head`,
        className: uu(`h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]`, e),
        ...t
    })
}

function _u({
    className: e,
    ...t
}) {
    return (0, V.jsx)(`td`, {
        "data-slot": `table-cell`,
        className: uu(`p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]`, e),
        ...t
    })
}
var vu = [`Reading`, `Listening`, `Vocabulary`];

function yu({
    studyTime: e = [],
    students: t,
    rows: n,
    topicId: r,
    onTopic: i,
    group: o,
    onGroup: s,
    selected: c,
    onStudent: u,
    query: d,
    onQuery: f,
    review: p,
    account: m,
    management: h,
    credentials: g
}) {
    let [_, v] = (0, a.useState)(`all`), y = (0, a.useRef)(null);
    (0, a.useEffect)(() => {
        c && y.current?.scrollIntoView({
            behavior: `smooth`,
            block: `start`
        })
    }, [c?.id]), (0, a.useEffect)(() => v(`all`), [r, o]);
    let b = (t, n) => e.filter(e => e.student_id === t && e.topic_id === n).reduce((e, t) => e + t.seconds, 0),
        S = l.find(e => e.id === r) || l[0],
        T = [...C, ...t.some(e => !w(e.group_id)) ? [{
            id: `unassigned`,
            name: `Needs a group`
        }] : []],
        E = o ? t.filter(e => o === `unassigned` ? !w(e.group_id) : e.group_id === o) : t,
        D = A(S.id, E.map(e => e.id), n, e => E.find(t => t.id === e)?.group_id),
        M = T.find(e => e.id === o)?.name || `All groups`,
        N = l[l.indexOf(S) + 1],
        P = E.filter(e => `${e.full_name} ${e.student_number||``} ${e.email}`.toLowerCase().includes(d.toLowerCase())).filter(e => _ === `all` || k(S.id, n.filter(t => t.student_id === e.id), e.group_id).complete === (_ === `finished`)),
        F = n.filter(e => E.some(t => t.id === e.student_id) && S.lessons[e.skill]?.includes(e.lesson_id)),
        I = e => {
            s(e), u(null), f(``)
        },
        ee = n.filter(e => e.student_id === c?.id),
        L = k(S.id, ee, c?.group_id);
    return (0, V.jsxs)(V.Fragment, {
        children: [(0, V.jsx)(`div`, {
            className: `page-heading`,
            children: (0, V.jsxs)(`div`, {
                children: [(0, V.jsx)(`p`, {
                    className: `eyebrow`,
                    children: `TEACHER WORKSPACE`
                }), (0, V.jsx)(`h1`, {
                    children: `Homework by topic`
                }), (0, V.jsx)(`p`, {
                    children: `Choose the topic you taught, then check each student’s homework by skill.`
                })]
            })
        }), (0, V.jsxs)(`section`, {
            className: `report-controls`,
            "aria-label": `Homework report filters`,
            children: [(0, V.jsxs)(`label`, {
                children: [`Homework topic`, (0, V.jsx)(`select`, {
                    value: S.id,
                    onChange: e => i(Number(e.target.value)),
                    children: l.map(e => (0, V.jsxs)(`option`, {
                        value: e.id,
                        children: [`Topic `, e.id, ` · `, e.title]
                    }, e.id))
                })]
            }), (0, V.jsxs)(`label`, {
                children: [`Class group`, (0, V.jsxs)(`select`, {
                    value: o || ``,
                    onChange: e => I(e.target.value || null),
                    children: [(0, V.jsx)(`option`, {
                        value: ``,
                        children: `All groups`
                    }), T.map(e => (0, V.jsx)(`option`, {
                        value: e.id,
                        children: e.name
                    }, e.id))]
                })]
            }), (0, V.jsx)(`span`, {
                className: `report-live`,
                children: `Updates every 30 seconds`
            })]
        }), o === `ielts-senior-1` && (0, V.jsx)(`p`, {
            className: `group-access-note`,
            children: `Senior 1: topics through 7 are open. Finish Topic 7 to unlock Topic 8, then finish each topic to unlock the next. Earlier homework remains visible in these reports.`
        }), (0, V.jsxs)(`div`, {
            className: `report-heading`,
            children: [(0, V.jsxs)(`h2`, {
                children: [S.title, ` homework `, (0, V.jsxs)(`span`, {
                    children: [`· `, M]
                })]
            }), (0, V.jsx)(`p`, {
                className: `muted`,
                children: `Only this topic’s assigned lessons count. Finished means completed and submitted; it is not a test score.`
            }), (0, V.jsx)(`p`, {
                className: `study-time-note`,
                children: `Study time estimates active lesson use from this update onward. Hidden tabs and two minutes without activity pause the clock; lesson audio still counts. Earlier time is unavailable.`
            })]
        }), (0, V.jsxs)(`div`, {
            className: `stats topic-stats`,
            children: [(0, V.jsxs)(`article`, {
                children: [(0, V.jsxs)(`strong`, {
                    children: [D.finished, (0, V.jsxs)(`small`, {
                        children: [` / `, D.students]
                    })]
                }), (0, V.jsxs)(`span`, {
                    children: [`Students finished `, S.title]
                })]
            }), (0, V.jsxs)(`article`, {
                children: [(0, V.jsxs)(`strong`, {
                    children: [D.ready, (0, V.jsxs)(`small`, {
                        children: [` / `, D.students]
                    })]
                }), (0, V.jsx)(`span`, {
                    children: N ? `Ready for ` + N.title : `All published homework finished`
                })]
            }), (0, V.jsxs)(`article`, {
                children: [(0, V.jsx)(`strong`, {
                    children: F.filter(e => e.status === `submitted` && O(e)).length
                }), (0, V.jsxs)(`span`, {
                    children: [S.title, ` submissions to review`]
                })]
            })]
        }), !o && (0, V.jsxs)(V.Fragment, {
            children: [(0, V.jsx)(`h2`, {
                className: `next-title`,
                children: `Your groups`
            }), (0, V.jsx)(`section`, {
                className: `group-grid`,
                "aria-label": `Class groups`,
                children: T.map(e => {
                    let r = t.filter(t => e.id === `unassigned` ? !w(t.group_id) : t.group_id === e.id),
                        i = A(S.id, r.map(e => e.id), n, e => r.find(t => t.id === e)?.group_id);
                    return (0, V.jsxs)(`button`, {
                        className: `group-card`,
                        onClick: () => I(e.id),
                        children: [(0, V.jsx)(`span`, {
                            className: `eyebrow`,
                            children: `CLASS GROUP`
                        }), (0, V.jsx)(`h2`, {
                            children: e.name
                        }), (0, V.jsxs)(`strong`, {
                            children: [r.length, ` students`]
                        }), (0, V.jsxs)(`span`, {
                            children: [i.finished, ` of `, r.length, ` finished `, S.title]
                        }), (0, V.jsx)(du, {
                            "aria-label": `${e.name} ${S.title} homework`,
                            value: i.percent
                        }), (0, V.jsxs)(`span`, {
                            children: [i.percent, `% of assigned lessons finished`]
                        }), (0, V.jsx)(`span`, {
                            className: `group-open`,
                            children: `View topic homework →`
                        })]
                    }, e.id)
                })
            })]
        }), o && (0, V.jsxs)(`section`, {
            className: `white-panel topic-roster`,
            "aria-label": `${M} ${S.title} homework`,
            children: [(0, V.jsxs)(`div`, {
                className: `section-title`,
                children: [(0, V.jsxs)(`div`, {
                    children: [(0, V.jsx)(`button`, {
                        className: `quiet`,
                        onClick: () => I(null),
                        children: `← All groups`
                    }), (0, V.jsxs)(`h2`, {
                        children: [M, ` · `, S.title]
                    })]
                }), (0, V.jsxs)(`label`, {
                    className: `search`,
                    children: [`Find a student`, (0, V.jsx)(`input`, {
                        placeholder: `Name or phone number`,
                        value: d,
                        onChange: e => f(e.target.value)
                    })]
                })]
            }), (0, V.jsxs)(`div`, {
                className: `readiness-banner ` + (D.students > 0 && D.ready === D.students ? `all-ready` : ``),
                role: `status`,
                children: [(0, V.jsx)(`strong`, {
                    children: D.students === 0 ? `No students in this group yet` : D.ready === D.students ? N ? `Everyone is ready for ` + N.title : `All published homework is finished` : `${D.ready} of ${D.students} students ${N?`ready for `+N.title:`have finished all published homework`}`
                }), (0, V.jsx)(`span`, {
                    children: D.students > 0 && (D.ready === D.students ? `Every student has submitted the homework required by their group’s topic access rules.` : `${D.students-D.ready} ${D.students-D.ready===1?`student still needs`:`students still need`} to finish required homework before moving on.`)
                })]
            }), (0, V.jsxs)(`div`, {
                className: `roster-filters`,
                children: [(0, V.jsx)(`h3`, {
                    children: `Student homework`
                }), (0, V.jsxs)(`label`, {
                    children: [`Show students`, (0, V.jsxs)(`select`, {
                        value: _,
                        onChange: e => v(e.target.value),
                        children: [(0, V.jsx)(`option`, {
                            value: `all`,
                            children: `All students`
                        }), (0, V.jsx)(`option`, {
                            value: `unfinished`,
                            children: `Topic unfinished`
                        }), (0, V.jsx)(`option`, {
                            value: `finished`,
                            children: `Topic finished`
                        })]
                    })]
                })]
            }), P.length ? (0, V.jsxs)(fu, {
                className: `homework-table`,
                children: [(0, V.jsx)(pu, {
                    children: (0, V.jsxs)(hu, {
                        children: [(0, V.jsx)(gu, {
                            children: `Student`
                        }), vu.map(e => (0, V.jsx)(gu, {
                            children: e
                        }, e)), (0, V.jsxs)(gu, {
                            children: [S.title, ` total`]
                        }), (0, V.jsx)(gu, {
                            children: `Study time`
                        }), (0, V.jsx)(gu, {
                            children: `Next step`
                        }), (0, V.jsx)(gu, {
                            children: `Details`
                        })]
                    })
                }), (0, V.jsx)(mu, {
                    children: P.map(e => {
                        let t = k(S.id, n.filter(t => t.student_id === e.id), e.group_id);
                        return (0, V.jsxs)(hu, {
                            "data-state": c?.id === e.id ? `selected` : void 0,
                            children: [(0, V.jsx)(_u, {
                                className: `report-student`,
                                children: (0, V.jsx)(`strong`, {
                                    children: e.full_name
                                })
                            }), vu.map(n => {
                                let r = t.bySkill[n];
                                return (0, V.jsx)(_u, {
                                    "data-label": n,
                                    children: (0, V.jsx)(bu, {
                                        value: r,
                                        label: `${e.full_name} ${S.title} ${n}`
                                    })
                                }, n)
                            }), (0, V.jsx)(_u, {
                                "data-label": `${S.title} total`,
                                children: (0, V.jsx)(bu, {
                                    value: t,
                                    label: `${e.full_name} ${S.title} total`
                                })
                            }), (0, V.jsx)(_u, {
                                "data-label": `Study time`,
                                children: (0, V.jsx)(`span`, {
                                    className: `study-duration`,
                                    children: j(b(e.id, S.id))
                                })
                            }), (0, V.jsx)(_u, {
                                "data-label": `Next step`,
                                children: (0, V.jsx)(xu, {
                                    report: t
                                })
                            }), (0, V.jsx)(_u, {
                                className: `report-work`,
                                children: (0, V.jsx)(`button`, {
                                    className: `quiet`,
                                    onClick: () => u(e),
                                    "aria-label": `View ${e.full_name} ${S.title} work`,
                                    children: `View topic work →`
                                })
                            })]
                        }, e.id)
                    })
                })]
            }) : (0, V.jsxs)(`div`, {
                className: `empty`,
                children: [(0, V.jsx)(`h3`, {
                    children: E.length ? `No students match these filters` : `No students in this group yet`
                }), (0, V.jsx)(`p`, {
                    children: E.length ? `Try another name or homework status.` : `Create or import student accounts below.`
                })]
            }), (0, V.jsxs)(`details`, {
                className: `group-totals`,
                children: [(0, V.jsx)(`summary`, {
                    children: `Group totals by skill`
                }), ` `, (0, V.jsx)(`div`, {
                    className: `group-skill-summary`,
                    "aria-label": `Group completion by skill`,
                    children: vu.map(e => {
                        let t = D.bySkill[e];
                        return (0, V.jsxs)(`article`, {
                            children: [(0, V.jsx)(`h3`, {
                                children: e
                            }), t.total > 0 ? (0, V.jsxs)(V.Fragment, {
                                children: [(0, V.jsxs)(`strong`, {
                                    children: [t.percent, `%`]
                                }), (0, V.jsx)(du, {
                                    value: t.percent,
                                    "aria-label": `${M} ${S.title} ${e} completion`
                                }), (0, V.jsxs)(`small`, {
                                    children: [t.completed, `/`, t.total, ` lessons finished`]
                                }), (0, V.jsxs)(`small`, {
                                    children: [t.finished, `/`, D.students, ` students finished this skill`]
                                })]
                            }) : (0, V.jsx)(`p`, {
                                children: `Not assigned`
                            })]
                        }, e)
                    })
                })]
            })]
        }), c && (0, V.jsxs)(`section`, {
            ref: y,
            className: `white-panel student-homework`,
            "aria-label": `${c.full_name} ${S.title} details`,
            children: [(0, V.jsxs)(`div`, {
                className: `section-title`,
                children: [(0, V.jsxs)(`div`, {
                    children: [(0, V.jsxs)(`p`, {
                        className: `eyebrow`,
                        children: [`TOPIC `, S.id, ` · `, S.title.toUpperCase()]
                    }), (0, V.jsx)(`h2`, {
                        children: c.full_name
                    })]
                }), (0, V.jsx)(`button`, {
                    className: `quiet`,
                    onClick: () => u(null),
                    children: `Close student details`
                })]
            }), (0, V.jsxs)(`div`, {
                className: `student-topic-total`,
                children: [(0, V.jsxs)(`strong`, {
                    children: [L.percent, `% of `, S.title, ` homework finished`]
                }), (0, V.jsxs)(`span`, {
                    children: [L.completed, `/`, L.total, ` assigned lessons submitted`]
                }), (0, V.jsx)(xu, {
                    report: L
                })]
            }), (0, V.jsxs)(`div`, {
                className: `student-study-summary`,
                children: [(0, V.jsxs)(`span`, {
                    children: [`Active study time · `, S.title]
                }), (0, V.jsx)(`strong`, {
                    children: j(b(c.id, S.id))
                }), (0, V.jsxs)(`details`, {
                    children: [(0, V.jsx)(`summary`, {
                        children: `Time spent across topics`
                    }), (0, V.jsx)(`dl`, {
                        children: l.map(e => (0, V.jsxs)(`div`, {
                            children: [(0, V.jsx)(`dt`, {
                                children: e.title
                            }), (0, V.jsx)(`dd`, {
                                children: j(b(c.id, e.id))
                            })]
                        }, e.id))
                    })]
                })]
            }), (0, V.jsxs)(`h3`, {
                className: `next-title`,
                children: [S.title, ` lesson checklist`]
            }), (0, V.jsx)(`div`, {
                className: `topic-skill-checklists`,
                children: vu.map(e => {
                    let t = L.bySkill[e];
                    return (0, V.jsxs)(`article`, {
                        children: [(0, V.jsxs)(`div`, {
                            className: `section-title`,
                            children: [(0, V.jsx)(`h3`, {
                                children: e
                            }), (0, V.jsx)(`span`, {
                                children: t.total ? `${t.completed}/${t.total} finished · ${t.percent}%` : `Not assigned`
                            })]
                        }), t.total ? (0, V.jsx)(`ul`, {
                            children: S.lessons[e].map(t => {
                                let n = ee.find(n => n.lesson_id === t && n.skill === e);
                                return (0, V.jsxs)(`li`, {
                                    children: [(0, V.jsx)(`span`, {
                                        children: x(t)
                                    }), (0, V.jsxs)(`span`, {
                                        className: `lesson-state ` + (O(n) ? `is-finished` : ``),
                                        children: [O(n) ? n?.status === `reviewed` ? `Finished · reviewed` : `Finished · awaiting review` : n?.completion?.completed || n && !n.completion ? `In progress` : `Not started`, !O(n) && n?.completion && n.completion.completed > 0 && (0, V.jsxs)(`small`, {
                                            children: [n.completion.completed, `/`, n.completion.total, ` required items completed`]
                                        })]
                                    })]
                                }, t)
                            })
                        }) : (0, V.jsxs)(`p`, {
                            className: `muted`,
                            children: [`No `, e.toLowerCase(), ` homework has been added to this topic.`]
                        })]
                    }, e)
                })
            }), (0, V.jsxs)(`details`, {
                className: `student-account-details`,
                children: [(0, V.jsx)(`summary`, {
                    children: `Student account & group`
                }), m(c)]
            }), (0, V.jsxs)(`h3`, {
                className: `next-title`,
                children: [S.title, ` responses & teacher feedback`]
            }), ee.filter(e => S.lessons[e.skill]?.includes(e.lesson_id)).map(e => p(e)), !ee.some(e => S.lessons[e.skill]?.includes(e.lesson_id)) && (0, V.jsxs)(`p`, {
                className: `muted`,
                children: [`No work saved for `, S.title, ` yet.`]
            })]
        }), g, (0, V.jsxs)(`details`, {
            className: `white-panel teacher-management`,
            children: [(0, V.jsx)(`summary`, {
                children: `Manage student accounts & programme topics`
            }), h]
        })]
    })
}

function bu({
    value: e,
    label: t
}) {
    return e.total ? (0, V.jsxs)(`div`, {
        className: `topic-skill-count`,
        children: [(0, V.jsxs)(`strong`, {
            children: [e.completed, `/`, e.total, ` `, (0, V.jsxs)(`span`, {
                children: [`· `, e.percent, `%`]
            })]
        }), (0, V.jsx)(du, {
            value: e.percent,
            "aria-label": t + ` finished`
        }), e.inProgress > 0 && (0, V.jsxs)(`small`, {
            children: [e.inProgress, ` in progress`]
        })]
    }) : (0, V.jsx)(`span`, {
        className: `not-assigned`,
        children: `Not assigned`
    })
}

function xu({
    report: e
}) {
    return (0, V.jsx)(`span`, {
        className: `readiness-label ` + (e.ready ? `is-ready` : ``),
        children: e.ready ? e.nextTitle ? `Ready for ` + e.nextTitle : `All homework finished` : e.complete ? `Earlier homework missing` : `Topic unfinished`
    })
}
var Su = {
    1: `food`,
    2: `health`,
    3: `work`,
    6: `sports`,
    7: `fashion`,
    8: `housing`,
    9: `media`,
    10: `art`
};

function Cu({
    groupId: e,
    rows: t,
    teacher: n,
    preview: r,
    guest: i,
    unlocked: a,
    selected: o,
    onSelect: c,
    onOpen: u,
    upcoming: d
}) {
    let f = e => n || r || a.includes(e),
        p = l.find(e => e.id === o);
    if (p) {
        let r = T(p.id, t),
            a = f(p.id);
        return l[l.indexOf(p) - 1], (0, V.jsxs)(`section`, {
            className: `topic-detail`,
            "aria-label": `${p.title} homework`,
            children: [(0, V.jsx)(`button`, {
                className: `quiet topic-back`,
                onClick: () => c(null),
                children: `← All topics`
            }), (0, V.jsxs)(`header`, {
                className: `topic-detail-header`,
                children: [(0, V.jsx)(`div`, {
                    className: `topic-detail-picture`,
                    children: (0, V.jsx)(`img`, {
                        src: `/topic-art/${Su[p.id]}-photo.webp`,
                        alt: ``,
                        width: `512`,
                        height: `512`
                    })
                }), (0, V.jsxs)(`div`, {
                    children: [(0, V.jsxs)(`p`, {
                        className: `eyebrow`,
                        children: [`TOPIC `, String(p.id).padStart(2, `0`)]
                    }), (0, V.jsx)(`h1`, {
                        children: p.title
                    }), (0, V.jsx)(`p`, {
                        children: n ? `Explore the homework materials for this topic.` : a ? `Your homework, one skill at a time.` : D(p.id, e)
                    }), (0, V.jsxs)(`div`, {
                        className: `topic-detail-progress`,
                        children: [(0, V.jsx)(du, {
                            value: r.percent,
                            "aria-label": `${p.title} completion`
                        }), (0, V.jsxs)(`span`, {
                            children: [r.completed, `/`, r.total, ` lessons `, i ? `completed` : `submitted`, ` · `, r.percent, `%`]
                        })]
                    })]
                })]
            }), (0, V.jsxs)(`div`, {
                className: `topic-materials`,
                children: [(0, V.jsx)(`h2`, {
                    children: `Choose a skill`
                }), (0, V.jsx)(`div`, {
                    className: `skill-grid`,
                    children: s.map((e, n) => (0, V.jsxs)(`article`, {
                        className: `skill-card`,
                        children: [(0, V.jsxs)(`span`, {
                            className: `skill-number n${n}`,
                            children: [`0`, n + 1]
                        }), (0, V.jsx)(`h3`, {
                            children: e
                        }), (0, V.jsx)(`p`, {
                            children: p.lessons[e].length ? `${p.lessons[e].length} ${e===`Reading`?`timed tests`:e===`Listening`?`IELTS tests`:e===`Writing`?`workbook`:`activities`}` : `Coming soon`
                        }), (0, V.jsx)(`div`, {
                            className: `lesson-list`,
                            children: p.lessons[e].map(n => {
                                let r = t.find(e => e.lesson_id === n);
                                return (0, V.jsxs)(`button`, {
                                    className: `quiet`,
                                    disabled: !a,
                                    onClick: () => u(e, n),
                                    children: [x(n), (0, V.jsxs)(`span`, {
                                        children: [r?.status === `reviewed` ? `Reviewed` : r?.status === `submitted` ? `Finished` : r ? `In progress` : `Start activity`, ` →`]
                                    })]
                                }, n)
                            })
                        })]
                    }, e))
                })]
            })]
        })
    }
    return (0, V.jsxs)(`section`, {
        className: `topic-library`,
        children: [(0, V.jsxs)(`header`, {
            className: `topic-library-heading`,
            children: [(0, V.jsxs)(`div`, {
                children: [(0, V.jsx)(`p`, {
                    className: `eyebrow`,
                    children: `CULLEN SCHOOL · SENIOR PROGRAMME`
                }), (0, V.jsx)(`h1`, {
                    children: `Choose your next topic.`
                }), (0, V.jsx)(`p`, {
                    children: `Explore your homework, practise each skill, and build your progress.`
                })]
            }), (0, V.jsxs)(`div`, {
                className: `library-count`,
                children: [(0, V.jsx)(`strong`, {
                    children: String(l.length).padStart(2, `0`)
                }), (0, V.jsxs)(`span`, {
                    children: [`topics ready`, (0, V.jsx)(`br`, {}), `to explore`]
                })]
            })]
        }), (0, V.jsxs)(`div`, {
            className: `topic-library-label`,
            children: [(0, V.jsx)(`h2`, {
                children: `Your topics`
            }), (0, V.jsx)(`span`, {
                children: n ? `Teacher access · all materials available` : e === `ielts-senior-1` ? `Topics through 7 are open · Finish Topic 7 to unlock Topic 8` : `Finish each topic to unlock the next`
            })]
        }), (0, V.jsx)(`div`, {
            className: `topic-picture-grid`,
            "aria-label": `Programme topics`,
            children: l.map((r, i) => {
                let a = T(r.id, t),
                    o = f(r.id);
                l[i - 1];
                let s = D(r.id, e),
                    u = o ? a.percent === 100 ? `Completed` : a.completed > 0 || t.some(e => r.lessons[e.skill]?.includes(e.lesson_id)) ? `Continue` : n ? `View materials` : `Start learning` : `Locked`;
                return (0, V.jsxs)(`button`, {
                    className: `topic-tile ` + (o ? `` : `is-locked`) + (a.percent === 100 ? ` is-complete` : ``),
                    disabled: !o,
                    "aria-label": o ? `Open ${r.title} homework` : `${r.title} · Locked. ${s}`,
                    title: o ? void 0 : s,
                    onClick: () => c(r.id),
                    children: [(0, V.jsxs)(`div`, {
                        className: `topic-illustration illustration-` + Su[r.id],
                        children: [(0, V.jsx)(`span`, {
                            className: `topic-number`,
                            children: String(r.id).padStart(2, `0`)
                        }), (0, V.jsx)(`img`, {
                            src: `/topic-art/${Su[r.id]}-photo.webp`,
                            alt: ``,
                            width: `512`,
                            height: `512`,
                            loading: i < 4 ? `eager` : `lazy`,
                            decoding: `async`
                        }), !o && (0, V.jsxs)(`span`, {
                            className: `topic-lock`,
                            "aria-hidden": `true`,
                            children: [(0, V.jsx)(`svg`, {
                                viewBox: `0 0 24 24`,
                                fill: `none`,
                                children: (0, V.jsx)(`path`, {
                                    d: `M7 10V7a5 5 0 0110 0v3M6 10h12v11H6z`,
                                    stroke: `currentColor`,
                                    strokeWidth: `1.8`,
                                    strokeLinejoin: `round`
                                })
                            }), `Locked`]
                        })]
                    }), (0, V.jsxs)(`div`, {
                        className: `topic-tile-copy`,
                        children: [(0, V.jsxs)(`div`, {
                            className: `topic-tile-title`,
                            children: [(0, V.jsx)(`h3`, {
                                children: r.title
                            }), (0, V.jsx)(`span`, {
                                "aria-hidden": `true`,
                                children: `↗`
                            })]
                        }), (0, V.jsxs)(`div`, {
                            className: `tile-progress`,
                            children: [(0, V.jsxs)(`span`, {
                                children: [a.completed, `/`, a.total, ` lessons`]
                            }), (0, V.jsxs)(`strong`, {
                                children: [a.percent, `%`]
                            })]
                        }), (0, V.jsx)(du, {
                            value: a.percent,
                            "aria-label": `${r.title} completion`
                        }), (0, V.jsxs)(`span`, {
                            className: `topic-tile-status`,
                            children: [u, a.percent === 100 && ` ✓`]
                        })]
                    })]
                }, r.id)
            })
        }), d.length > 0 && (0, V.jsxs)(`details`, {
            className: `upcoming-topics`,
            children: [(0, V.jsxs)(`summary`, {
                children: [d.length, ` more topics on the way `, (0, V.jsx)(`span`, {
                    children: `Explore what’s next`
                })]
            }), (0, V.jsx)(`div`, {
                className: `upcoming-topic-grid`,
                children: d.map(e => (0, V.jsxs)(`article`, {
                    children: [(0, V.jsxs)(`span`, {
                        className: `eyebrow`,
                        children: [`TOPIC `, String(e.id).padStart(2, `0`)]
                    }), (0, V.jsx)(`h3`, {
                        children: e.title || `To be announced`
                    }), (0, V.jsx)(`span`, {
                        className: `badge`,
                        children: `Coming soon`
                    })]
                }, e.id))
            })]
        })]
    })
}

function wu(e, t) {
    (0, a.useEffect)(() => {
        if (!t) return;
        let n = crypto.randomUUID(),
            r = 0,
            i = 0,
            a = performance.now(),
            o = Date.now(),
            s = !1,
            c = null,
            l = !1,
            u = !1,
            d = () => document.visibilityState === `visible` && document.hasFocus(),
            f = () => {
                o = Date.now()
            },
            p = t => {
                t.origin !== location.origin || t.source !== e.current?.contentWindow || t.data?.type !== `academy-activity` || (t.data.interaction === !0 && f(), s = t.data.media === !0)
            },
            m = async () => {
                if (!(l || u)) {
                    c || (c = {
                        session: n,
                        sequence: ++r,
                        seconds: Math.min(30, Math.floor(i)),
                        lessonId: t.id,
                        skill: t.skill
                    }, i = 0), l = !0;
                    try {
                        let e = await fetch(`/api/study-time`, {
                            method: `POST`,
                            headers: {
                                "Content-Type": `application/json`
                            },
                            body: JSON.stringify(c),
                            keepalive: !0
                        });
                        e.ok ? c = null : e.status < 500 && (c = null, i = 0)
                    } catch {} finally {
                        l = !1
                    }
                }
            }, h = setInterval(() => {
                let e = performance.now(),
                    t = Math.min(2, (e - a) / 1e3);
                a = e, d() && (s || Date.now() - o < 12e4) && (i = Math.min(30, i + t))
            }, 1e3), g = setInterval(() => {
                m()
            }, 15e3), _ = () => {
                a = performance.now(), document.visibilityState !== `visible` && m()
            }, v = () => {
                m()
            };
        window.addEventListener(`message`, p), document.addEventListener(`visibilitychange`, _), window.addEventListener(`pagehide`, v);
        for (let e of [`pointerdown`, `keydown`, `wheel`, `touchstart`]) window.addEventListener(e, f, {
            passive: !0
        });
        return m(), () => {
            clearInterval(h), clearInterval(g), window.removeEventListener(`message`, p), document.removeEventListener(`visibilitychange`, _), window.removeEventListener(`pagehide`, v);
            for (let e of [`pointerdown`, `keydown`, `wheel`, `touchstart`]) window.removeEventListener(e, f);
            i >= 1 && !c && fetch(`/api/study-time`, {
                method: `POST`,
                headers: {
                    "Content-Type": `application/json`
                },
                body: JSON.stringify({
                    session: n,
                    sequence: ++r,
                    seconds: Math.min(30, Math.floor(i)),
                    lessonId: t.id,
                    skill: t.skill
                }),
                keepalive: !0
            }).catch(() => {}), u = !0
        }
    }, [t?.id, t?.skill])
}
var Tu = (...e) => e.filter((e, t, n) => !!e && e.trim() !== `` && n.indexOf(e) === t).join(` `).trim(),
    Eu = e => e.replace(/([a-z0-9])([A-Z])/g, `$1-$2`).toLowerCase(),
    Du = e => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) => n ? n.toUpperCase() : t.toLowerCase()),
    Ou = e => {
        let t = Du(e);
        return t.charAt(0).toUpperCase() + t.slice(1)
    },
    ku = {
        xmlns: `http://www.w3.org/2000/svg`,
        width: 24,
        height: 24,
        viewBox: `0 0 24 24`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 2,
        strokeLinecap: `round`,
        strokeLinejoin: `round`
    },
    Au = e => {
        for (let t in e)
            if (t.startsWith(`aria-`) || t === `role` || t === `title`) return !0;
        return !1
    },
    ju = (0, a.createContext)({}),
    Mu = () => (0, a.useContext)(ju),
    Nu = (0, a.forwardRef)(({
        color: e,
        size: t,
        strokeWidth: n,
        absoluteStrokeWidth: r,
        className: i = ``,
        children: o,
        iconNode: s,
        ...c
    }, l) => {
        let {
            size: u = 24,
            strokeWidth: d = 2,
            absoluteStrokeWidth: f = !1,
            color: p = `currentColor`,
            className: m = ``
        } = Mu() ?? {}, h = r ?? f ? Number(n ?? d) * 24 / Number(t ?? u) : n ?? d;
        return (0, a.createElement)(`svg`, {
            ref: l,
            ...ku,
            width: t ?? u ?? ku.width,
            height: t ?? u ?? ku.height,
            stroke: e ?? p,
            strokeWidth: h,
            className: Tu(`lucide`, m, i),
            ...!o && !Au(c) && {
                "aria-hidden": `true`
            },
            ...c
        }, [...s.map(([e, t]) => (0, a.createElement)(e, t)), ...Array.isArray(o) ? o : [o]])
    }),
    Pu = (e, t) => {
        let n = (0, a.forwardRef)(({
            className: n,
            ...r
        }, i) => (0, a.createElement)(Nu, {
            ref: i,
            iconNode: t,
            className: Tu(`lucide-${Eu(Ou(e))}`, `lucide-${e}`, n),
            ...r
        }));
        return n.displayName = Ou(e), n
    },
    Fu = Pu(`check`, [
        [`path`, {
            d: `M20 6 9 17l-5-5`,
            key: `1gmf2c`
        }]
    ]),
    Iu = Pu(`chevron-down`, [
        [`path`, {
            d: `m6 9 6 6 6-6`,
            key: `qrunsl`
        }]
    ]),
    Lu = Pu(`chevron-up`, [
        [`path`, {
            d: `m18 15-6-6-6 6`,
            key: `153udz`
        }]
    ]);

function Ru({
    ...e
}) {
    return (0, V.jsx)(Ws, {
        "data-slot": `select`,
        ...e
    })
}

function zu({
    ...e
}) {
    return (0, V.jsx)(hc, {
        "data-slot": `select-group`,
        ...e
    })
}

function Bu({
    ...e
}) {
    return (0, V.jsx)(Js, {
        "data-slot": `select-value`,
        ...e
    })
}

function Vu({
    className: e,
    size: t = `default`,
    children: n,
    ...r
}) {
    return (0, V.jsxs)(Ks, {
        "data-slot": `select-trigger`,
        "data-size": t,
        className: uu(`flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground`, e),
        ...r,
        children: [n, (0, V.jsx)(Ys, {
            asChild: !0,
            children: (0, V.jsx)(Iu, {
                className: `size-4 opacity-50`
            })
        })]
    })
}

function Hu({
    className: e,
    children: t,
    position: n = `item-aligned`,
    align: r = `center`,
    ...i
}) {
    return (0, V.jsx)(Qs, {
        children: (0, V.jsxs)(ec, {
            "data-slot": `select-content`,
            className: uu(`relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`, n === `popper` && `data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1`, e),
            position: n,
            align: r,
            ...i,
            children: [(0, V.jsx)(Gu, {}), (0, V.jsx)(fc, {
                className: uu(`p-1`, n === `popper` && `h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1`),
                children: t
            }), (0, V.jsx)(Ku, {})]
        })
    })
}

function Uu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(_c, {
        "data-slot": `select-label`,
        className: uu(`px-2 py-1.5 text-xs text-muted-foreground`, e),
        ...t
    })
}

function Wu({
    className: e,
    children: t,
    ...n
}) {
    return (0, V.jsxs)(xc, {
        "data-slot": `select-item`,
        className: uu(`relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2`, e),
        ...n,
        children: [(0, V.jsx)(`span`, {
            "data-slot": `select-item-indicator`,
            className: `absolute right-2 flex size-3.5 items-center justify-center`,
            children: (0, V.jsx)(Tc, {
                children: (0, V.jsx)(Fu, {
                    className: `size-4`
                })
            })
        }), (0, V.jsx)(Cc, {
            children: t
        })]
    })
}

function Gu({
    className: e,
    ...t
}) {
    return (0, V.jsx)(Dc, {
        "data-slot": `select-scroll-up-button`,
        className: uu(`flex cursor-default items-center justify-center py-1`, e),
        ...t,
        children: (0, V.jsx)(Lu, {
            className: `size-4`
        })
    })
}

function Ku({
    className: e,
    ...t
}) {
    return (0, V.jsx)(kc, {
        "data-slot": `select-scroll-down-button`,
        className: uu(`flex cursor-default items-center justify-center py-1`, e),
        ...t,
        children: (0, V.jsx)(Iu, {
            className: `size-4`
        })
    })
}
var qu = x,
    Ju = e => e ? new Date(e).toLocaleDateString(void 0, {
        month: `short`,
        day: `numeric`
    }) : `Not signed in yet`;

function Yu({
    admin: e = !1
}) {
    let [t, n] = (0, a.useState)(null), [r, o] = (0, a.useState)(!0), [c, d] = (0, a.useState)(``), [m, h] = (0, a.useState)(``), [g, _] = (0, a.useState)(``), [v, y] = (0, a.useState)(!1), [b, x] = (0, a.useState)(!1), [T, E] = (0, a.useState)(e ? `teacher` : `topics`), [D, O] = (0, a.useState)(null), [k, A] = (0, a.useState)(``), [j, M] = (0, a.useState)(null), [N, P] = (0, a.useState)(!1), [F, I] = (0, a.useState)(``), [ee, L] = (0, a.useState)(null), [te, ne] = (0, a.useState)(``), [R, z] = (0, a.useState)(``), [re, ie] = (0, a.useState)(``), [B, ae] = (0, a.useState)(``), [oe, se] = (0, a.useState)(!1), [ce, le] = (0, a.useState)(null), [ue, de] = (0, a.useState)(l[0].id), [fe, pe] = (0, a.useState)(null), H = (0, a.useRef)(null), me = (0, a.useRef)(null), he = (0, a.useRef)(Promise.resolve()), ge = (0, a.useRef)(null), U = (0, a.useRef)(t);
    U.current = t, wu(ge, T === `lesson` && !N && !t?.teacher && !t?.guest && !t?.user.mustChangePassword && t?.profile ? j : null);
    async function _e(e, t) {
        let n = await fetch(e, t);
        return n.status === 401 && (H.current ||= fetch(`/api/auth`, {
            method: `POST`,
            headers: {
                "Content-Type": `application/json`
            },
            body: JSON.stringify({
                action: `refresh`
            })
        }).then(e => e.ok).finally(() => {
            H.current = null
        }), await H.current && (n = await fetch(e, t))), n
    }
    async function W() {
        try {
            let e = await _e(`/api/platform`),
                t = await e.json();
            e.ok ? (U.current = t, n(t), _(t.profile?.full_name || ``), I(e => t.profile?.group_id || e || t.pendingGroup || ``), O(e => e && t.students.find(t => t.id === e.id) || null)) : e.status === 401 ? U.current && d(`Your session expired. Sign in again to continue saving your work.`) : d(t.error || `Please try again.`)
        } catch {
            d(`Could not connect. Please retry.`)
        } finally {
            o(!1)
        }
    }(0, a.useEffect)(() => {
        let e = new URLSearchParams(location.search);
        e.has(`login_error`) && (d(e.get(`login_error`) === `link` ? `That link expired or was opened in a different browser. Request a new link and open it in this browser.` : `Sign-in is temporarily unavailable. Please retry.`), history.replaceState(null, ``, location.pathname)), e.get(`preview`), W()
    }, []);
    async function ve(e) {
        if (N) throw Error(`This is a read-only preview. Sign in to save real progress.`);
        let t = await _e(`/api/platform`, {
                method: `POST`,
                headers: {
                    "Content-Type": `application/json`
                },
                body: JSON.stringify(e)
            }),
            n = await t.json();
        if (!t.ok) throw Error(n.error || `Please try again.`);
        return n
    }
    async function ye() {
        x(!0), d(``);
        try {
            let t = await fetch(`/api/student-auth`, {
                    method: `POST`,
                    headers: {
                        "Content-Type": `application/json`
                    },
                    body: JSON.stringify({
                        action: e ? `admin-login` : `login`,
                        studentNumber: te,
                        password: R,
                        ...e ? {} : {
                            groupId: F
                        }
                    })
                }),
                n = await t.json();
            if (!t.ok) throw Error(n.error || `Please try again.`);
            z(``), await W()
        } catch (e) {
            d(e.message)
        } finally {
            x(!1)
        }
    }
    async function be() {
        if (re !== B) {
            d(`Your new passwords do not match.`);
            return
        }
        x(!0), d(``);
        try {
            let e = await fetch(`/api/student-auth`, {
                    method: `POST`,
                    headers: {
                        "Content-Type": `application/json`
                    },
                    body: JSON.stringify({
                        action: `password`,
                        currentPassword: R,
                        password: re
                    })
                }),
                t = await e.json();
            if (!e.ok) throw Error(t.error || `Please retry.`);
            z(``), ie(``), ae(``), se(!1), await W()
        } catch (e) {
            d(e.message)
        } finally {
            x(!1)
        }
    }
    async function xe() {
        x(!0);
        try {
            await ve({
                action: `profile`,
                fullName: g,
                groupId: F
            }), await W()
        } catch (e) {
            d(e.message)
        } finally {
            x(!1)
        }
    }(0, a.useEffect)(() => {
        function e(e) {
            if (e.origin !== location.origin || e.source !== ge.current?.contentWindow || e.data?.type !== `academy-work`) return;
            let {
                lessonId: t,
                skill: n,
                draft: r,
                status: i,
                requestId: a
            } = e.data;
            u[n]?.includes(t) && (he.current = he.current.catch(() => {}).then(() => ve({
                action: `progress`,
                lessonId: t,
                skill: n,
                topicId: p(t)?.id,
                status: i === `submitted` ? `submitted` : `in_progress`,
                draft: r
            })).then(async e => {
                await W(), d(e.message || `Progress saved`), me.current && me.current.id === a && me.current.resolve()
            }).catch(e => {
                d(e.message), me.current && me.current.id === a && me.current.reject(e)
            }))
        }
        return window.addEventListener(`message`, e), () => window.removeEventListener(`message`, e)
    }, [N]), (0, a.useEffect)(() => {
        if (!t) return;
        let e = () => {
                document.visibilityState === `visible` && _e(`/api/platform`).catch(() => {})
            },
            n = setInterval(e, 1200 * 1e3);
        return window.addEventListener(`focus`, e), () => {
            clearInterval(n), window.removeEventListener(`focus`, e)
        }
    }, [!!t]), (0, a.useEffect)(() => {
        if (!t?.teacher) return;
        let e = () => {
                document.visibilityState === `visible` && W()
            },
            n = setInterval(e, 3e4);
        return window.addEventListener(`focus`, e), () => {
            clearInterval(n), window.removeEventListener(`focus`, e)
        }
    }, [t?.teacher]);
    let Se = e => e.filter(e => e.status === `reviewed`).length,
        Ce = e => e.filter(e => e.status === `submitted` || e.status === `reviewed`).length,
        we = (e, t = f) => t ? Math.floor(Ce(e) / t * 100) : 0,
        Te = (t?.students || []).filter(e => e.email.toLowerCase() !== t?.user.email.toLowerCase()),
        Ee = (t?.progress || []).filter(e => u[e.skill]?.includes(e.lesson_id)),
        De = Ee.filter(e => e.student_id === t?.profile?.id),
        Oe = Array.from({
            length: 20
        }, (e, t) => t + 1).filter(e => !l.some(t => t.id === e)),
        ke = e => t?.teacher || N || t?.unlockedTopics?.includes(p(e)?.id || 0),
        Ae = l.flatMap(e => s.flatMap(t => e.lessons[t].map(e => ({
            skill: t,
            id: e
        })))).filter(e => ke(e.id)),
        je = Ae.findIndex(e => e.id === j?.id);
    async function Me(e) {
        if (!(b || me.current || e?.id === j?.id)) {
            if (e && !ke(e.id)) {
                d(`Complete every lesson in the previous topics first.`);
                return
            }
            x(!0);
            try {
                j && !N && (d(`Saving before moving…`), await new Promise((e, t) => {
                    let n = crypto.randomUUID(),
                        r = setTimeout(() => {
                            me.current = null, t(Error(`Could not confirm your save. Stay here and try again.`))
                        }, 15e3);
                    me.current = {
                        id: n,
                        resolve: () => {
                            clearTimeout(r), me.current = null, e()
                        },
                        reject: e => {
                            clearTimeout(r), me.current = null, t(e)
                        }
                    }, ge.current?.contentWindow?.postMessage({
                        type: `academy-save`,
                        requestId: n
                    }, location.origin)
                })), e && pe(p(e.id)?.id || null), M(e), d(``), E(e ? `lesson` : `topics`)
            } catch (e) {
                d(e.message)
            } finally {
                x(!1)
            }
        }
    }

    function Ne(e, t) {
        Me({
            skill: e,
            id: t
        })
    }
    async function Pe() {
        ge.current?.contentWindow?.postMessage({
            type: `academy-submit`
        }, location.origin)
    }
    return r ? (0, V.jsx)(`main`, {
        className: `loading`,
        children: `Loading your classroom…`
    }) : t ? e && t && !t.teacher ? (0, V.jsxs)(`main`, {
        className: `onboard`,
        children: [(0, V.jsx)(`h1`, {
            children: `Teacher access only`
        }), (0, V.jsx)(`p`, {
            children: `This dashboard is available to the school administrator.`
        }), (0, V.jsx)(`a`, {
            href: `/`,
            children: `Go to your classroom`
        }), (0, V.jsx)(i, {
            destination: `/admin`
        })]
    }) : t.user.mustChangePassword || oe ? (0, V.jsxs)(`main`, {
        className: `onboard`,
        children: [(0, V.jsx)(`p`, {
            className: `eyebrow`,
            children: t.user.mustChangePassword ? `FIRST SIGN-IN` : `YOUR ACCOUNT`
        }), (0, V.jsx)(`h1`, {
            children: `Choose your password`
        }), (0, V.jsx)(`p`, {
            children: t.user.mustChangePassword ? `Replace your temporary password before starting your lessons.` : `Changing your password signs you out of other devices.`
        }), (0, V.jsxs)(`form`, {
            onSubmit: e => {
                e.preventDefault(), be()
            },
            children: [(0, V.jsxs)(`label`, {
                children: [`Current password`, (0, V.jsx)(`input`, {
                    type: `password`,
                    autoComplete: `current-password`,
                    value: R,
                    onChange: e => z(e.target.value),
                    required: !0,
                    maxLength: 128
                })]
            }), (0, V.jsxs)(`label`, {
                children: [`New password`, (0, V.jsx)(`input`, {
                    type: `password`,
                    autoComplete: `new-password`,
                    value: re,
                    onChange: e => ie(e.target.value),
                    required: !0,
                    minLength: 12,
                    maxLength: 128
                })]
            }), (0, V.jsxs)(`label`, {
                children: [`Confirm new password`, (0, V.jsx)(`input`, {
                    type: `password`,
                    autoComplete: `new-password`,
                    value: B,
                    onChange: e => ae(e.target.value),
                    required: !0,
                    minLength: 12,
                    maxLength: 128
                })]
            }), (0, V.jsx)(`p`, {
                className: `muted`,
                children: `Use at least 12 characters. A short sentence works well.`
            }), (0, V.jsx)(`button`, {
                disabled: b,
                children: `Save password & continue`
            }), !t.user.mustChangePassword && (0, V.jsx)(`button`, {
                type: `button`,
                className: `quiet`,
                onClick: () => se(!1),
                children: `Cancel`
            }), (0, V.jsx)(`p`, {
                className: `notice`,
                role: `status`,
                children: c
            })]
        }), (0, V.jsx)(i, {})]
    }) : !t.profile || !t.teacher && !w(t.profile.group_id) ? (0, V.jsxs)(`main`, {
        className: `onboard`,
        children: [(0, V.jsx)(`p`, {
            className: `eyebrow`,
            children: `ONE LAST STEP`
        }), (0, V.jsx)(`h1`, {
            children: `Join your classroom`
        }), (0, V.jsx)(`p`, {
            children: `Confirm your full name and class group so your teacher can track your work.`
        }), (0, V.jsxs)(`form`, {
            onSubmit: e => {
                e.preventDefault(), xe()
            },
            children: [(0, V.jsxs)(`label`, {
                children: [`First and last name`, (0, V.jsx)(`input`, {
                    value: g,
                    onChange: e => _(e.target.value),
                    required: !0,
                    autoComplete: `name`,
                    maxLength: 120
                })]
            }), !t.teacher && (0, V.jsxs)(`label`, {
                children: [`Your group`, (0, V.jsxs)(`select`, {
                    value: F,
                    onChange: e => I(e.target.value),
                    required: !0,
                    children: [(0, V.jsx)(`option`, {
                        value: ``,
                        children: `Choose your group`
                    }), C.map(e => (0, V.jsx)(`option`, {
                        value: e.id,
                        children: e.name
                    }, e.id))]
                })]
            }), (0, V.jsx)(`p`, {
                children: t.user.email
            }), (0, V.jsx)(`button`, {
                disabled: b,
                children: `Enter classroom`
            }), (0, V.jsx)(`p`, {
                role: `status`,
                children: c
            })]
        })]
    }) : (0, V.jsxs)(`div`, {
        className: `academy`,
        children: [(0, V.jsxs)(`header`, {
            className: `school-header`,
            children: [(0, V.jsxs)(`a`, {
                href: `/`,
                className: `brand`,
                children: [`CULLEN `, (0, V.jsx)(`span`, {
                    children: `SCHOOL`
                })]
            }), (0, V.jsxs)(`nav`, {
                "aria-label": `Main navigation`,
                children: [(0, V.jsx)(`button`, {
                    className: T === `topics` ? `nav-active` : ``,
                    onClick: () => {
                        E(`topics`), M(null), pe(null)
                    },
                    children: `My programme`
                }), (0, V.jsx)(`button`, {
                    className: T === `progress` ? `nav-active` : ``,
                    onClick: () => {
                        E(`progress`), M(null)
                    },
                    children: `My progress`
                }), t.teacher && (0, V.jsx)(`button`, {
                    className: T === `teacher` ? `nav-active` : ``,
                    onClick: () => {
                        location.href = `/admin`
                    },
                    children: `Admin dashboard`
                })]
            }), (0, V.jsxs)(`div`, {
                className: `account`,
                children: [(0, V.jsxs)(`strong`, {
                    children: [t.profile.full_name, (0, V.jsx)(`small`, {
                        children: C.find(e => e.id === t.profile?.group_id)?.name
                    })]
                }), t.user.studentAccount && (0, V.jsx)(`button`, {
                    className: `quiet`,
                    onClick: () => {
                        z(``), se(!0), d(``)
                    },
                    children: `Change password`
                }), t.guest ? (0, V.jsx)(`a`, {
                    href: `/admin`,
                    children: `Teacher sign-in`
                }) : (0, V.jsx)(`button`, {
                    className: `quiet`,
                    onClick: async () => {
                        if (N) {
                            location.href = `/`;
                            return
                        }
                        await fetch(`/api/auth`, {
                            method: `POST`,
                            headers: {
                                "Content-Type": `application/json`
                            },
                            body: JSON.stringify({
                                action: `logout`
                            })
                        }), location.href = `/`
                    },
                    children: `Sign out`
                })]
            })]
        }), t.guest && T !== `lesson` && (0, V.jsx)(`div`, {
            className: `preview-banner`,
            children: `Guest practice · Progress is saved in this browser only and is not sent to your teacher.`
        }), N && (0, V.jsx)(`div`, {
            className: `preview-banner`,
            children: `Read-only preview · Email sign-in and real student records are not connected.`
        }), T === `lesson` && j ? (0, V.jsxs)(`main`, {
            className: `lesson-stage`,
            children: [(0, V.jsxs)(`div`, {
                className: `lesson-toolbar`,
                children: [(0, V.jsx)(`button`, {
                    className: `quiet`,
                    disabled: b,
                    onClick: () => Me(null),
                    children: `← Topic`
                }), (0, V.jsx)(`strong`, {
                    children: p(j.id)?.title
                }), (0, V.jsx)(`span`, {
                    role: `status`,
                    children: c
                }), (0, V.jsx)(`button`, {
                    className: `quiet`,
                    disabled: b || N,
                    onClick: () => ge.current?.contentWindow?.postMessage({
                        type: `academy-save`
                    }, location.origin),
                    children: `Save work`
                }), (0, V.jsx)(`button`, {
                    disabled: b || N,
                    onClick: Pe,
                    children: t.guest ? `Mark complete` : `Complete & submit`
                })]
            }), (0, V.jsxs)(`nav`, {
                className: `lesson-navigation`,
                "aria-label": `Exercise navigation`,
                children: [(0, V.jsx)(`button`, {
                    className: `quiet`,
                    disabled: b || je <= 0,
                    onClick: () => Me(Ae[je - 1]),
                    children: `← Previous`
                }), (0, V.jsxs)(`div`, {
                    className: `lesson-picker`,
                    children: [(0, V.jsxs)(Ru, {
                        value: j.id,
                        disabled: b,
                        onValueChange: e => {
                            let t = Ae.find(t => t.id === e);
                            t && Me(t)
                        },
                        children: [(0, V.jsx)(Vu, {
                            "aria-label": `Choose an exercise`,
                            children: (0, V.jsx)(Bu, {})
                        }), (0, V.jsx)(Hu, {
                            position: `popper`,
                            className: `lesson-options`,
                            children: s.map(e => (0, V.jsxs)(zu, {
                                children: [(0, V.jsx)(Uu, {
                                    children: e
                                }), u[e].map(t => (0, V.jsxs)(Wu, {
                                    value: t,
                                    disabled: !ke(t),
                                    children: [p(t)?.title, ` · `, e, ` · `, qu(t)]
                                }, t))]
                            }, e))
                        })]
                    }), (0, V.jsxs)(`small`, {
                        children: [je + 1, ` of `, Ae.length]
                    })]
                }), (0, V.jsx)(`button`, {
                    className: `quiet`,
                    disabled: b || je >= Ae.length - 1,
                    onClick: () => Me(Ae[je + 1]),
                    children: `Next →`
                })]
            }), (0, V.jsx)(`iframe`, {
                ref: ge,
                title: `${j.skill}: ${qu(j.id)}`,
                src: `${S(j.id)}#${j.skill}/${j.id}`,
                onLoad: () => {
                    let e = De.find(e => e.lesson_id === j.id);
                    ge.current?.contentWindow?.postMessage({
                        type: `academy-restore`,
                        draft: e ? JSON.parse(e.draft) : {}
                    }, location.origin)
                }
            }, j.id)]
        }) : (0, V.jsxs)(`main`, {
            className: `dashboard`,
            children: [T === `topics` && (0, V.jsx)(Cu, {
                groupId: t.profile.group_id,
                rows: De,
                teacher: t.teacher,
                preview: N,
                guest: t.guest,
                unlocked: t.unlockedTopics || [],
                selected: fe,
                onSelect: pe,
                onOpen: Ne,
                upcoming: Oe.map(e => ({
                    id: e,
                    title: t.topics.find(t => t.id === e)?.title || ``
                }))
            }), T === `progress` && (0, V.jsxs)(V.Fragment, {
                children: [(0, V.jsx)(`div`, {
                    className: `page-heading`,
                    children: (0, V.jsxs)(`div`, {
                        children: [(0, V.jsx)(`p`, {
                            className: `eyebrow`,
                            children: `YOUR LEARNING RECORD`
                        }), (0, V.jsx)(`h1`, {
                            children: `My progress`
                        })]
                    })
                }), (0, V.jsxs)(`div`, {
                    className: `stats`,
                    children: [(0, V.jsxs)(`article`, {
                        children: [(0, V.jsx)(`strong`, {
                            children: De.length
                        }), (0, V.jsx)(`span`, {
                            children: `Lessons started`
                        })]
                    }), (0, V.jsxs)(`article`, {
                        children: [(0, V.jsx)(`strong`, {
                            children: Ce(De)
                        }), (0, V.jsx)(`span`, {
                            children: t.guest ? `Completed on this device` : `Completed & submitted`
                        })]
                    }), (0, V.jsxs)(`article`, {
                        children: [(0, V.jsx)(`strong`, {
                            children: Se(De)
                        }), (0, V.jsx)(`span`, {
                            children: t.guest ? `Teacher reviews unavailable` : `Reviewed by teacher`
                        })]
                    })]
                }), (0, V.jsxs)(`section`, {
                    className: `white-panel`,
                    children: [(0, V.jsxs)(`h2`, {
                        children: [`Your programme · `, we(De), `% complete`]
                    }), (0, V.jsxs)(`p`, {
                        className: `muted`,
                        children: [Ce(De), ` of `, f, ` published lessons `, t.guest ? `marked complete on this device. Guest work is not sent to your teacher.` : `submitted. Completion tracks submissions, not test accuracy.`]
                    }), s.map(e => (0, V.jsxs)(`div`, {
                        className: `skill-progress`,
                        children: [(0, V.jsx)(`strong`, {
                            children: e
                        }), (0, V.jsx)(du, {
                            value: Ce(De.filter(t => t.skill === e)) / u[e].length * 100
                        }), (0, V.jsxs)(`span`, {
                            children: [Ce(De.filter(t => t.skill === e)), `/`, u[e].length, ` `, t.guest ? `completed` : `submitted`]
                        })]
                    }, e))]
                }), (0, V.jsxs)(`section`, {
                    className: `white-panel`,
                    children: [(0, V.jsx)(`h2`, {
                        children: `Recent work & feedback`
                    }), De.length ? De.map(e => (0, V.jsxs)(`article`, {
                        className: `work-row`,
                        children: [(0, V.jsxs)(`div`, {
                            children: [(0, V.jsx)(`h3`, {
                                children: qu(e.lesson_id)
                            }), (0, V.jsxs)(`p`, {
                                children: [e.skill, ` · `, t.guest && e.status === `submitted` ? `completed` : e.status.replace(/_/g, ` `), ` · `, Ju(e.updated_at)]
                            }), e.feedback && (0, V.jsx)(`blockquote`, {
                                children: e.feedback
                            })]
                        }), (0, V.jsx)(`button`, {
                            className: `quiet`,
                            disabled: !ke(e.lesson_id),
                            onClick: () => Ne(e.skill, e.lesson_id),
                            children: `Continue →`
                        })]
                    }, e.lesson_id)) : (0, V.jsxs)(`div`, {
                        className: `empty`,
                        children: [(0, V.jsx)(`h3`, {
                            children: `Your learning record starts here.`
                        }), (0, V.jsx)(`p`, {
                            children: `Open a lesson and save your work to see it here.`
                        }), (0, V.jsx)(`button`, {
                            onClick: () => E(`topics`),
                            children: `Explore topics`
                        })]
                    })]
                })]
            }), T === `teacher` && t.teacher && (0, V.jsx)(yu, {
                studyTime: t.studyTime || [],
                students: Te,
                rows: Ee,
                topicId: ue,
                onTopic: de,
                group: ee,
                onGroup: L,
                selected: D,
                onStudent: O,
                query: k,
                onQuery: A,
                review: e => (0, V.jsx)(Xu, {
                    row: e,
                    save: async (t, n) => {
                        await ve({
                            action: `feedback`,
                            studentId: e.student_id,
                            lessonId: e.lesson_id,
                            feedback: t,
                            status: n
                        }), await W()
                    }
                }, e.lesson_id),
                account: e => (0, V.jsxs)(V.Fragment, {
                    children: [(0, V.jsx)(Zu, {
                        student: e,
                        post: ve,
                        defaultGroup: e.group_id || C[0].id,
                        onDone: async e => {
                            le(e), await W()
                        }
                    }), (0, V.jsxs)(`label`, {
                        className: `student-group-control`,
                        children: [`Group`, (0, V.jsxs)(`select`, {
                            value: e.group_id || ``,
                            disabled: b || N,
                            onChange: async t => {
                                x(!0);
                                try {
                                    await ve({
                                        action: `move-student`,
                                        studentId: e.id,
                                        groupId: t.target.value
                                    }), await W(), d(`Student group updated.`)
                                } catch (e) {
                                    d(e.message)
                                } finally {
                                    x(!1)
                                }
                            },
                            children: [(0, V.jsx)(`option`, {
                                value: ``,
                                disabled: !0,
                                children: `Choose a group`
                            }), C.map(e => (0, V.jsx)(`option`, {
                                value: e.id,
                                children: e.name
                            }, e.id))]
                        })]
                    })]
                }),
                management: (0, V.jsxs)(V.Fragment, {
                    children: [(0, V.jsxs)(`section`, {
                        className: `white-panel`,
                        children: [(0, V.jsx)(`h2`, {
                            children: `Create a student login`
                        }), (0, V.jsx)(`p`, {
                            className: `muted`,
                            children: `Give each student a unique ID. Their temporary password will appear once after creation.`
                        }), (0, V.jsx)(Zu, {
                            post: ve,
                            defaultGroup: ee || C[0].id,
                            onDone: async e => {
                                le(e), await W()
                            }
                        })]
                    }), (0, V.jsx)(Qu, {
                        post: ve,
                        onDone: W
                    }), (0, V.jsxs)(`section`, {
                        className: `white-panel`,
                        children: [(0, V.jsx)(`h2`, {
                            children: `Programme topics`
                        }), (0, V.jsx)(`p`, {
                            className: `muted`,
                            children: `Name the remaining topics. They stay unpublished until their exercises are added.`
                        }), (0, V.jsx)(`div`, {
                            className: `topic-edit-grid`,
                            children: Oe.map(e => (0, V.jsxs)(`form`, {
                                onSubmit: async t => {
                                    t.preventDefault();
                                    let n = t.currentTarget;
                                    try {
                                        await ve({
                                            action: `topic`,
                                            id: e,
                                            title: new FormData(n).get(`title`)
                                        }), await W(), d(`Topic ${e} saved`)
                                    } catch (e) {
                                        d(e.message)
                                    }
                                },
                                children: [(0, V.jsxs)(`label`, {
                                    children: [`Topic `, e, (0, V.jsx)(`input`, {
                                        name: `title`,
                                        required: !0,
                                        maxLength: 100,
                                        defaultValue: t.topics.find(t => t.id === e)?.title || ``,
                                        placeholder: `Topic name`
                                    })]
                                }), (0, V.jsx)(`button`, {
                                    disabled: N,
                                    children: `Save`
                                })]
                            }, e))
                        })]
                    })]
                }),
                credentials: (0, V.jsx)(V.Fragment, {
                    children: ce && (0, V.jsxs)(`section`, {
                        className: `credential-card`,
                        role: `status`,
                        children: [(0, V.jsxs)(`div`, {
                            className: `section-title`,
                            children: [(0, V.jsxs)(`h2`, {
                                children: [`Login ready for `, ce.fullName]
                            }), (0, V.jsx)(`button`, {
                                className: `quiet`,
                                onClick: () => le(null),
                                children: `Dismiss`
                            })]
                        }), (0, V.jsx)(`p`, {
                            children: `Share these details directly with this student. The temporary password is shown only here and must be changed at first sign-in.`
                        }), (0, V.jsxs)(`dl`, {
                            children: [(0, V.jsx)(`dt`, {
                                children: `Student ID`
                            }), (0, V.jsx)(`dd`, {
                                children: (0, V.jsx)(`code`, {
                                    children: ce.studentNumber
                                })
                            }), (0, V.jsx)(`dt`, {
                                children: `Temporary password`
                            }), (0, V.jsx)(`dd`, {
                                children: (0, V.jsx)(`code`, {
                                    children: ce.password
                                })
                            })]
                        }), (0, V.jsx)(`button`, {
                            onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(`Student ID: ${ce.studentNumber}\nTemporary password: ${ce.password}\nSign in: ${location.origin}/`), d(`Login details copied.`)
                                } catch {
                                    d(`Copy the student ID and password shown above.`)
                                }
                            },
                            children: `Copy login details`
                        })]
                    })
                })
            }), T !== `lesson` && (0, V.jsx)(`p`, {
                className: `notice`,
                role: `status`,
                children: c
            })]
        }), (0, V.jsx)(`footer`, {
            children: `Cullen School · Senior Programme`
        })]
    }) : (0, V.jsxs)(`main`, {
        className: `signin`,
        children: [(0, V.jsxs)(`section`, {
            className: `sign-story`,
            children: [(0, V.jsxs)(`a`, {
                className: `brand`,
                href: `/`,
                children: [`CULLEN `, (0, V.jsx)(`span`, {
                    children: `SCHOOL`
                })]
            }), (0, V.jsxs)(`div`, {
                children: [(0, V.jsx)(`p`, {
                    className: `eyebrow`,
                    children: `SENIOR PROGRAMME`
                }), (0, V.jsxs)(`h1`, {
                    children: [`Your next chapter`, (0, V.jsx)(`br`, {}), `in English.`]
                }), (0, V.jsxs)(`p`, {
                    children: [`Twenty topics. Focused IELTS practice.`, (0, V.jsx)(`br`, {}), `Vocabulary you can put to work.`]
                })]
            }), (0, V.jsx)(`small`, {
                children: `Listen · Read · Write · Build vocabulary`
            })]
        }), (0, V.jsxs)(`section`, {
            className: `sign-form`,
            children: [(0, V.jsx)(`p`, {
                className: `eyebrow`,
                children: e ? `TEACHER SIGN-IN` : `YOUR CLASSROOM`
            }), (0, V.jsx)(`h2`, {
                children: `Welcome back.`
            }), (0, V.jsx)(`p`, {
                children: e ? `Sign in with your administrator phone number and password.` : `Use your phone number and the password your teacher gave you.`
            }), (0, V.jsxs)(`form`, {
                onSubmit: e => {
                    e.preventDefault(), ye()
                },
                children: [(0, V.jsxs)(`label`, {
                    children: [e ? `Administrator phone number` : `Phone number or student ID`, (0, V.jsx)(`input`, {
                        required: !0,
                        autoComplete: `username`,
                        value: te,
                        onChange: e => ne(e.target.value),
                        minLength: 3,
                        maxLength: 32,
                        placeholder: `+998 90 123 45 67`,
                        spellCheck: !1
                    })]
                }), (0, V.jsxs)(`label`, {
                    children: [`Password`, (0, V.jsx)(`input`, {
                        type: `password`,
                        required: !0,
                        autoComplete: `current-password`,
                        value: R,
                        onChange: e => z(e.target.value),
                        maxLength: 128
                    })]
                }), !e && (0, V.jsxs)(`label`, {
                    children: [`Your group`, (0, V.jsxs)(`select`, {
                        required: !0,
                        value: F,
                        onChange: e => I(e.target.value),
                        children: [(0, V.jsx)(`option`, {
                            value: ``,
                            children: `Choose your assigned group`
                        }), C.map(e => (0, V.jsx)(`option`, {
                            value: e.id,
                            children: e.name
                        }, e.id))]
                    })]
                }), (0, V.jsx)(`button`, {
                    disabled: b,
                    children: b ? `Please wait…` : `Sign in`
                }), (0, V.jsx)(`p`, {
                    className: `notice`,
                    role: `status`,
                    children: c
                })]
            }), (0, V.jsx)(`p`, {
                className: `muted`,
                children: e ? `Only the school administrator can access the dashboard.` : `Forgot your ID or password? Ask your teacher for a new temporary password.`
            }), !e && (0, V.jsx)(`a`, {
                href: `/admin`,
                className: `teacher-login`,
                children: `Teacher sign-in →`
            }), e && (0, V.jsx)(`a`, {
                href: `/`,
                children: `← Student sign-in`
            })]
        })]
    })
}

function Xu({
    row: e,
    save: t
}) {
    let [n, r] = (0, a.useState)(e.feedback), [i, o] = (0, a.useState)(``), s = {};
    try {
        s = JSON.parse(e.draft)
    } catch {}
    return (0, V.jsxs)(`article`, {
        className: `review`,
        children: [(0, V.jsx)(`h3`, {
            children: qu(e.lesson_id)
        }), (0, V.jsxs)(`p`, {
            children: [e.skill, ` · `, e.status.replace(/_/g, ` `), ` · `, Ju(e.updated_at)]
        }), (0, V.jsxs)(`details`, {
            children: [(0, V.jsx)(`summary`, {
                children: `View student responses`
            }), (0, V.jsx)(`dl`, {
                children: Object.entries(s).map(([e, t]) => (0, V.jsxs)(`div`, {
                    children: [(0, V.jsx)(`dt`, {
                        children: e
                    }), (0, V.jsx)(`dd`, {
                        children: String(t) || `No response`
                    })]
                }, e))
            })]
        }), (0, V.jsxs)(`form`, {
            onSubmit: async e => {
                e.preventDefault();
                try {
                    await t(n, `reviewed`), o(`Review saved.`)
                } catch (e) {
                    o(e.message)
                }
            },
            children: [(0, V.jsxs)(`label`, {
                children: [`Teacher feedback`, (0, V.jsx)(`textarea`, {
                    value: n,
                    onChange: e => r(e.target.value),
                    maxLength: 5e3,
                    rows: 3
                })]
            }), (0, V.jsx)(`button`, {
                children: `Save review`
            }), (0, V.jsx)(`p`, {
                role: `status`,
                children: i
            })]
        })]
    })
}

function Zu({
    student: e,
    post: t,
    onDone: n,
    defaultGroup: r
}) {
    let [i, o] = (0, a.useState)(``), [s, c] = (0, a.useState)(``), [l, u] = (0, a.useState)(w(r) ? r : C[0].id), [d, f] = (0, a.useState)(!1), [p, m] = (0, a.useState)(``), h = !!e?.student_number;
    return (0, V.jsxs)(`form`, {
        className: `account-issue-form`,
        onSubmit: async r => {
            r.preventDefault(), f(!0), m(``);
            try {
                await n((await t({
                    action: h ? `reset-password` : `issue-account`,
                    studentId: e?.id,
                    fullName: i,
                    studentNumber: s,
                    groupId: l
                })).credentials), o(``), c(``), m(h ? `New temporary password issued. Previous sessions have been signed out.` : `Student login created.`)
            } catch (e) {
                m(e.message)
            } finally {
                f(!1)
            }
        },
        children: [h ? (0, V.jsx)(`p`, {
            className: `muted`,
            children: `A reset replaces the password and signs this student out on every device.`
        }) : (0, V.jsxs)(`div`, {
            className: `account-issue-fields`,
            children: [!e && (0, V.jsxs)(`label`, {
                children: [`Full name`, (0, V.jsx)(`input`, {
                    autoComplete: `off`,
                    required: !0,
                    value: i,
                    onChange: e => o(e.target.value),
                    maxLength: 120
                })]
            }), (0, V.jsxs)(`label`, {
                children: [`Student ID`, (0, V.jsx)(`input`, {
                    autoComplete: `off`,
                    required: !0,
                    value: s,
                    onChange: e => c(e.target.value),
                    minLength: 3,
                    maxLength: 32,
                    pattern: `[+A-Za-z0-9 ()-]{3,32}`,
                    placeholder: `Phone number or student ID`
                })]
            }), (0, V.jsxs)(`label`, {
                children: [`Group`, (0, V.jsx)(`select`, {
                    value: l,
                    onChange: e => u(e.target.value),
                    children: C.map(e => (0, V.jsx)(`option`, {
                        value: e.id,
                        children: e.name
                    }, e.id))
                })]
            })]
        }), (0, V.jsx)(`button`, {
            disabled: d,
            children: d ? `Please wait…` : h ? `Issue new temporary password` : e ? `Issue student login` : `Create student login`
        }), (0, V.jsx)(`p`, {
            className: `notice`,
            role: `status`,
            children: p
        })]
    })
}

function Qu({
    post: e,
    onDone: t
}) {
    let [n, r] = (0, a.useState)(``), [i, o] = (0, a.useState)(``), [s, c] = (0, a.useState)(!1), [l, u] = (0, a.useState)(``);
    return (0, V.jsx)(`section`, {
        className: `white-panel`,
        children: (0, V.jsxs)(`details`, {
            children: [(0, V.jsx)(`summary`, {
                children: `Import a class roster`
            }), (0, V.jsx)(`p`, {
                className: `muted`,
                children: `One student per line: name | phone number | Senior 1 or Senior 3. Existing matching accounts are kept; passwords are never silently reset.`
            }), (0, V.jsxs)(`form`, {
                onSubmit: async a => {
                    a.preventDefault(), c(!0), u(``);
                    try {
                        let a = await e({
                            action: `import-accounts`,
                            students: n.split(/\r?\n/).filter(e => e.trim()).map((e, t) => {
                                let n = e.split(`|`).map(e => e.trim());
                                if (n.length !== 3) throw Error(`Use three columns on row ${t+1}.`);
                                let r = n[2].toLowerCase().replace(/^ielts\s+/, ``).replace(/[-_]/g, ` `).replace(/\s+/g, ` `).trim(),
                                    i = r === `senior 1` ? `ielts-senior-1` : r === `senior 3` ? `ielts-senior-3` : ``;
                                return {
                                    fullName: n[0],
                                    studentNumber: n[1],
                                    groupId: i
                                }
                            }),
                            password: i
                        });
                        o(``), r(``), await t(), u(`${a.imported.created} accounts created · ${a.imported.existing} existing accounts kept · ${a.imported.total} students checked.`)
                    } catch (e) {
                        u(e.message)
                    } finally {
                        c(!1)
                    }
                },
                children: [(0, V.jsxs)(`label`, {
                    children: [`Student roster`, (0, V.jsx)(`textarea`, {
                        required: !0,
                        rows: 10,
                        maxLength: 2e4,
                        value: n,
                        onChange: e => r(e.target.value),
                        placeholder: `Student name | +998 90 123 45 67 | Senior 1`
                    })]
                }), (0, V.jsxs)(`label`, {
                    children: [`Temporary password for these students`, (0, V.jsx)(`input`, {
                        type: `password`,
                        autoComplete: `new-password`,
                        required: !0,
                        minLength: 10,
                        maxLength: 128,
                        value: i,
                        onChange: e => o(e.target.value)
                    })]
                }), (0, V.jsx)(`p`, {
                    className: `muted`,
                    children: `Students must choose their own password at first sign-in.`
                }), (0, V.jsx)(`button`, {
                    disabled: s,
                    children: s ? `Creating accounts…` : `Create roster accounts`
                }), (0, V.jsx)(`p`, {
                    className: `notice`,
                    role: `status`,
                    children: l
                })]
            })]
        })
    })
}
export {
    Yu as
    default
};