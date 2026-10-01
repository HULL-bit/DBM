"""
Export des rapports de séances de répétition en PDF, Excel ou CSV.
Inclut toutes les séances, présences, statistiques et infos des kourels
(responsable, maitres de cœur, jewrine).
"""
from .models import SeanceConservatoire, PresenceSeance, Kourel


# ─────────────────────────────── Helpers ────────────────────────────────────

def _get_queryset(date_debut=None, date_fin=None, kourel_id=None, type_seance='repetition'):
    qs = SeanceConservatoire.objects.all()
    if type_seance:
        qs = qs.filter(type_seance=type_seance)
    if date_debut:
        qs = qs.filter(date_heure__date__gte=date_debut)
    if date_fin:
        qs = qs.filter(date_heure__date__lte=date_fin)
    if kourel_id:
        qs = qs.filter(kourel_id=kourel_id)
    return qs.select_related(
        'kourel',
        'kourel__responsable',
        'kourel__maitre_de_coeur',
        'kourel__maitre_de_coeur_2',
        'kourel__jewrine',
    ).prefetch_related(
        'presences', 'presences__membre', 'khassidas', 'kourel__membres'
    ).order_by('date_heure')


def _get_stats_par_membre(qs):
    """Stats de présence par membre, strictement scopées au(x) kourel(s) DONT IL EST
    MEMBRE : une présence "invité" (membre d'un AUTRE kourel venu assister, present_invite)
    ne compte jamais dans le taux propre du membre, elle n'a d'impact que sur
    `nb_hors_kourel` (surplus), pour ne pas fausser son évaluation d'assiduité sur son
    propre kourel. "present_hors_kourel" est différent : un membre DU kourel présent mais
    qui n'a pas presté (sanction, mise à l'écart...) — ça compte comme une présence normale.

    Retourne une liste de dicts : membre_id, membre, nom, kourel, nb_seances_attendues,
    nb_presents (retards et hors-kourel-sanction inclus), nb_retards, nb_hors_kourel_sanction,
    nb_abs_just, nb_abs_non_just, taux_presence, justifications (liste de {seance, date,
    justification}), nb_hors_kourel (surplus d'invités d'un autre kourel).
    """
    from collections import defaultdict
    seance_ids = list(qs.values_list('id', flat=True))
    membre_seances = defaultdict(set)
    membre_kourel = {}
    for seance in qs.select_related('kourel'):
        kourel = seance.kourel
        if not kourel:
            continue
        for m in kourel.membres.all():
            membre_seances[m.id].add(seance.id)
            if m.id not in membre_kourel:
                membre_kourel[m.id] = (m, kourel.nom)

    # Présences "propres" : uniquement les séances où le membre appartient réellement au
    # kourel de la séance (cf. membre_seances ci-dessus) — une présence "invité" d'un
    # membre dans une séance d'un AUTRE kourel n'est jamais dans cet ensemble.
    presences = PresenceSeance.objects.filter(seance_id__in=seance_ids).select_related('membre', 'seance')
    membre_presents = defaultdict(int)
    membre_retards = defaultdict(int)
    membre_hors_kourel_sanction = defaultdict(int)
    membre_abs_just = defaultdict(int)
    membre_abs_non_just = defaultdict(int)
    membre_hors_kourel = defaultdict(int)
    membre_justifications = defaultdict(list)
    for p in presences:
        mid = p.membre_id
        est_propre = p.seance_id in membre_seances.get(mid, set())
        if p.statut == 'present_invite' or not est_propre:
            # Invité d'un autre kourel (ou ligne orpheline) : jamais dans le taux propre.
            if p.statut == 'present_invite':
                membre_hors_kourel[mid] += 1
            continue
        if p.statut == 'present_retard':
            membre_presents[mid] += 1
            membre_retards[mid] += 1
        elif p.statut == 'present_hors_kourel':
            # Membre du kourel présent mais qui n'a pas presté : compte comme une présence.
            membre_presents[mid] += 1
            membre_hors_kourel_sanction[mid] += 1
        elif p.statut == 'present':
            membre_presents[mid] += 1
        elif p.statut == 'absent_justifie':
            membre_abs_just[mid] += 1
            if p.remarque:
                membre_justifications[mid].append({
                    'seance': str(p.seance), 'date': p.seance.date_heure, 'justification': p.remarque,
                })
        else:
            membre_abs_non_just[mid] += 1
    result = []
    for mid, seance_ids_att in membre_seances.items():
        nb_attendues = len(seance_ids_att)
        nb_pres = membre_presents[mid]
        nb_ret = membre_retards[mid]
        nb_aj = membre_abs_just[mid]
        nb_anj = membre_abs_non_just[mid]
        taux = round(100 * nb_pres / nb_attendues, 1) if nb_attendues else 0
        m, kourel_nom = membre_kourel.get(mid, (None, ''))
        nom = m.get_full_name() if m else f'Membre #{mid}'
        result.append({
            'membre_id': mid, 'membre': m, 'nom': nom, 'kourel': kourel_nom,
            'nb_seances_attendues': nb_attendues, 'nb_presents': nb_pres, 'nb_retards': nb_ret,
            'nb_hors_kourel_sanction': membre_hors_kourel_sanction.get(mid, 0),
            'nb_abs_just': nb_aj, 'nb_abs_non_just': nb_anj,
            'justifications': membre_justifications.get(mid, []),
            'taux_presence': taux,
            'nb_hors_kourel': membre_hors_kourel.get(mid, 0),
        })
    return sorted(result, key=lambda x: (-x['taux_presence'], x['nom']))


def _get_stats_par_membre_combinees(qs_repetition, qs_prestation):
    """Combine les stats de présence d'un membre pour les répétitions (comportement
    historique, inchangé : nb_presents/nb_retards/taux_presence/justifications...) avec un
    taux GLOBAL séparé pour les prestations, calculé sur le(s) même(s) kourel(s) dont il est
    membre. Les deux taux restent distincts (jamais mélangés) : répétition et prestation ne
    mesurent pas la même pratique.
    Ajoute à chaque dict : nb_prest_attendues, nb_prest_presents, taux_prestation (None si
    aucune prestation sur la période) et taux_repetition (alias explicite de taux_presence,
    pour que le rapport affiche sans ambiguïté les deux taux côte à côte).
    """
    stats_rep = _get_stats_par_membre(qs_repetition)
    stats_prest_par_id = {s['membre_id']: s for s in _get_stats_par_membre(qs_prestation)}

    for s in stats_rep:
        p = stats_prest_par_id.get(s['membre_id'])
        s['taux_repetition'] = s['taux_presence']
        s['nb_prest_attendues'] = p['nb_seances_attendues'] if p else 0
        s['nb_prest_presents'] = p['nb_presents'] if p else 0
        s['taux_prestation'] = p['taux_presence'] if p else None
        if p:
            s['justifications'] = s['justifications'] + p['justifications']

    # Membres qui n'ont QUE des prestations sur la période (aucune répétition) : à inclure
    # aussi, avec les champs "répétition" à zéro plutôt que de les faire disparaître.
    ids_deja_listes = {s['membre_id'] for s in stats_rep}
    for mid, p in stats_prest_par_id.items():
        if mid in ids_deja_listes:
            continue
        stats_rep.append({
            'membre_id': mid, 'membre': p['membre'], 'nom': p['nom'], 'kourel': p['kourel'],
            'nb_seances_attendues': 0, 'nb_presents': 0, 'nb_retards': 0,
            'nb_hors_kourel_sanction': 0, 'nb_abs_just': 0, 'nb_abs_non_just': 0,
            'justifications': p['justifications'], 'taux_presence': None,
            'nb_hors_kourel': p['nb_hors_kourel'],
            'taux_repetition': None,
            'nb_prest_attendues': p['nb_seances_attendues'], 'nb_prest_presents': p['nb_presents'],
            'taux_prestation': p['taux_presence'],
        })

    return sorted(stats_rep, key=lambda x: (-(x['taux_presence'] or x['taux_prestation'] or 0), x['nom']))


def _get_invites_hors_kourel(qs):
    """Présences 'invité' (membre d'un AUTRE kourel venu assister, present_invite)
    enregistrées sur les séances de `qs`, regroupées par kourel ACCUEILLANT (celui de la
    séance). Retourne {kourel_id: [{nom, kourel_origine, nb_venues, detail: [{seance, date}]}]}"""
    from collections import defaultdict
    presences = PresenceSeance.objects.filter(
        seance__in=qs, statut='present_invite'
    ).select_related('membre', 'seance', 'seance__kourel').order_by('seance__date_heure')

    par_kourel_accueil = defaultdict(lambda: defaultdict(list))
    for p in presences:
        if not p.seance.kourel_id or not p.membre_id:
            continue
        par_kourel_accueil[p.seance.kourel_id][p.membre_id].append(p)

    result = {}
    for kourel_accueil_id, par_membre in par_kourel_accueil.items():
        invites = []
        for mid, rows in par_membre.items():
            membre = rows[0].membre
            kourels_origine = list(
                membre.kourels.exclude(pk=kourel_accueil_id).values_list('nom', flat=True)
            )
            invites.append({
                'nom': membre.get_full_name(),
                'kourel_origine': ', '.join(kourels_origine) or 'Aucun kourel',
                'nb_venues': len(rows),
                'detail': [
                    {'seance': str(r.seance), 'date': r.seance.date_heure.strftime('%d/%m/%Y') if r.seance.date_heure else ''}
                    for r in rows
                ],
            })
        result[kourel_accueil_id] = sorted(invites, key=lambda x: x['nom'])
    return result


def _build_detail_par_kourel(kourel_qs, qs, stats_membres):
    """Regroupe les statistiques de présence PAR KOUREL puis PAR MEMBRE (jamais par séance,
    qui mélangerait les kourels entre eux) — chaque bloc contient l'encadrement du kourel,
    ses membres avec leur assiduité propre (justifications d'absence incluses), et les
    éventuels invités "hors kourel" venus d'un autre kourel assister à ses répétitions."""
    stats_par_membre_id = {s['membre_id']: s for s in stats_membres}
    invites_par_kourel = _get_invites_hors_kourel(qs)
    seances_par_kourel = {}
    for s in qs:
        seances_par_kourel[s.kourel_id] = seances_par_kourel.get(s.kourel_id, 0) + 1

    blocs = []
    for k in kourel_qs:
        membres_stats = []
        for m in k.membres.all().order_by('last_name', 'first_name'):
            s = stats_par_membre_id.get(m.id)
            membres_stats.append(s if s else {
                'membre_id': m.id, 'nom': m.get_full_name(), 'kourel': k.nom,
                'nb_seances_attendues': 0, 'nb_presents': 0, 'nb_retards': 0,
                'nb_hors_kourel_sanction': 0,
                'nb_abs_just': 0, 'nb_abs_non_just': 0, 'justifications': [],
                'taux_presence': 0, 'nb_hors_kourel': 0,
                'taux_repetition': 0, 'nb_prest_attendues': 0, 'nb_prest_presents': 0,
                'taux_prestation': None,
            })
        membres_stats.sort(key=lambda x: (-(x['taux_presence'] or x.get('taux_prestation') or 0), x['nom']))
        blocs.append({
            'kourel': k,
            'encadrement': _kourel_encadrement(k),
            'nb_seances': seances_par_kourel.get(k.pk, 0),
            'membres': membres_stats,
            'invites': invites_par_kourel.get(k.pk, []),
        })
    return blocs


def _kourel_encadrement(kourel):
    """Retourne un dict avec les noms des encadrants d'un kourel."""
    return {
        'responsable': kourel.responsable.get_full_name() if kourel.responsable else '—',
        'maitre_1': kourel.maitre_de_coeur.get_full_name() if kourel.maitre_de_coeur else '—',
        'maitre_2': kourel.maitre_de_coeur_2.get_full_name() if kourel.maitre_de_coeur_2 else '—',
        'jewrine': kourel.jewrine.get_full_name() if kourel.jewrine else '—',
    }


# ────────────────────────── Excel export ────────────────────────────────────

_GREEN = '2D5F3F'
_GOLD  = 'C9A961'
_LIGHT = 'F4EAD5'
_GREY  = 'DDDDDD'


def export_rapport_excel(date_debut=None, date_fin=None, kourel_id=None):
    """Export Excel multi-feuilles : stats globales, fiche kourels, taux membres, détail séances."""
    try:
        import openpyxl
        from openpyxl.styles import Font, Alignment, Border, Side, PatternFill, numbers
        from openpyxl.utils import get_column_letter
    except ImportError:
        return None

    qs = _get_queryset(date_debut, date_fin, kourel_id)
    wb = openpyxl.Workbook()

    # ── Styles communs ──
    def hdr_font(bold=True, white=False, size=10):
        return Font(bold=bold, color='FFFFFF' if white else '000000', size=size)

    def fill(hex_color):
        return PatternFill('solid', fgColor=hex_color)

    thin = Side(style='thin')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    def _write_header_row(ws, row_num, headers, bg_color=_GREEN, text_color='FFFFFF', bold=True):
        for col, h in enumerate(headers, 1):
            c = ws.cell(row=row_num, column=col, value=h)
            c.font = Font(bold=bold, color=text_color)
            c.fill = PatternFill('solid', fgColor=bg_color)
            c.border = border
            c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    def _autofit(ws, col_widths):
        for col, w in enumerate(col_widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = w

    periode_str = (
        f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}"
        if date_debut and date_fin else "Toutes les séances créées"
    )

    # ══════════════════════════════════════════════════
    # Feuille 1 : Statistiques globales
    # ══════════════════════════════════════════════════
    ws_stats = wb.active
    ws_stats.title = "Statistiques"

    # Les présences "invité" (membre d'un AUTRE kourel) sont exclues du taux global : elles
    # ne reflètent l'assiduité propre d'aucun kourel particulier, affichées à part.
    # "present_hors_kourel" (membre du kourel présent mais n'ayant pas presté) compte, lui,
    # normalement — c'est une présence réelle, juste sans participation active.
    presences_all = PresenceSeance.objects.filter(seance__in=qs).exclude(statut='present_invite')
    nb_hors_kourel = PresenceSeance.objects.filter(seance__in=qs, statut='present_invite').count()
    nb_seances = qs.count()
    nb_total = presences_all.count()
    nb_retards = presences_all.filter(statut='present_retard').count()
    nb_sans_prestation = presences_all.filter(statut='present_hors_kourel').count()
    nb_presents = presences_all.filter(statut__in=PresenceSeance.STATUTS_PRESENT).count()
    nb_abs_just = presences_all.filter(statut='absent_justifie').count()
    nb_abs_non_just = presences_all.filter(statut='absent_non_justifie').count()
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0

    ws_stats.merge_cells('A1:C1')
    title_cell = ws_stats.cell(row=1, column=1, value="Rapport des Séances de Répétition — DBM")
    title_cell.font = Font(bold=True, size=14, color='FFFFFF')
    title_cell.fill = fill(_GREEN)
    title_cell.alignment = Alignment(horizontal='center')

    ws_stats.merge_cells('A2:C2')
    period_cell = ws_stats.cell(row=2, column=1, value=f"Période : {periode_str}")
    period_cell.font = Font(italic=True, size=10)
    period_cell.fill = fill(_LIGHT)
    period_cell.alignment = Alignment(horizontal='center')

    _write_header_row(ws_stats, 4, ['Indicateur', 'Valeur', ''], bg_color=_GOLD, text_color='000000')

    stats_rows = [
        ("Nombre total de séances", nb_seances),
        ("Total marquages présence", nb_total),
        ("Présents (dont retards et hors kourel)", nb_presents),
        ("  dont en retard", nb_retards),
        ("  dont présent sans avoir presté (hors kourel)", nb_sans_prestation),
        ("Absents justifiés", nb_abs_just),
        ("Absents non justifiés", nb_abs_non_just),
        ("Taux de présence global", f"{taux_presence}%"),
        ("Présences invités d'un autre kourel (hors calcul)", nb_hors_kourel),
    ]
    for i, (label, val) in enumerate(stats_rows, 5):
        ws_stats.cell(row=i, column=1, value=label).border = border
        c = ws_stats.cell(row=i, column=2, value=val)
        c.border = border
        c.alignment = Alignment(horizontal='center')
        if i % 2 == 0:
            for col in [1, 2]:
                ws_stats.cell(row=i, column=col).fill = fill(_GREY)
    _autofit(ws_stats, [32, 18, 5])

    # ══════════════════════════════════════════════════
    # Feuille 2 : Fiche Kourels
    # ══════════════════════════════════════════════════
    ws_kourels = wb.create_sheet("Kourels")
    _write_header_row(ws_kourels, 1, [
        'Kourel', 'Responsable', '1er Maître de cœur', '2ème Maître de cœur',
        'Jewrine', 'Nb membres', 'Nb séances'
    ])
    kourel_qs = Kourel.objects.select_related(
        'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
    ).prefetch_related('membres')
    if kourel_id:
        kourel_qs = kourel_qs.filter(pk=kourel_id)

    seances_par_kourel = {}
    for s in qs:
        seances_par_kourel[s.kourel_id] = seances_par_kourel.get(s.kourel_id, 0) + 1

    for row_i, k in enumerate(kourel_qs.order_by('ordre', 'nom'), 2):
        enc = _kourel_encadrement(k)
        row_data = [
            k.nom, enc['responsable'], enc['maitre_1'], enc['maitre_2'],
            enc['jewrine'], k.membres.count(), seances_par_kourel.get(k.pk, 0)
        ]
        bg = _LIGHT if row_i % 2 == 0 else 'FFFFFF'
        for col, val in enumerate(row_data, 1):
            c = ws_kourels.cell(row=row_i, column=col, value=val)
            c.border = border
            c.fill = fill(bg)
            c.alignment = Alignment(horizontal='center' if col > 1 else 'left')
    _autofit(ws_kourels, [22, 22, 22, 22, 22, 12, 12])

    # ══════════════════════════════════════════════════
    # Feuille 3 : Taux de présence par membre
    # ══════════════════════════════════════════════════
    qs_prestations = _get_queryset(date_debut, date_fin, kourel_id, type_seance='prestation')
    stats_membres = _get_stats_par_membre_combinees(qs, qs_prestations)
    ws_membres = wb.create_sheet("Taux par membre")
    _write_header_row(ws_membres, 1, [
        'Membre', 'Kourel', 'Séances attendues (rép.)', 'Présents (dont retards)', 'dont retards',
        'dont hors kourel (sans prestation)',
        'Abs. justifiés', 'Abs. non justifiés', 'Taux répétitions (%)',
        'Prestations attendues', 'Prestations présent', 'Taux prestations (%)',
        'Invités (autre kourel)'
    ])
    for i, s in enumerate(stats_membres, 2):
        taux_rep = s['taux_repetition']
        taux_prest = s['taux_prestation']
        row_data = [
            s['nom'], s['kourel'], s['nb_seances_attendues'],
            s['nb_presents'], s['nb_retards'], s['nb_hors_kourel_sanction'],
            s['nb_abs_just'], s['nb_abs_non_just'],
            f"{taux_rep}%" if taux_rep is not None else '—',
            s['nb_prest_attendues'], s['nb_prest_presents'],
            f"{taux_prest}%" if taux_prest is not None else '—',
            s['nb_hors_kourel'],
        ]
        # Couleur selon le meilleur taux disponible (répétition en priorité)
        taux_ref = taux_rep if taux_rep is not None else (taux_prest or 0)
        if taux_ref >= 80:
            row_bg = 'E8F5E9'
        elif taux_ref >= 50:
            row_bg = 'FFF9E6'
        else:
            row_bg = 'FFEBEE'
        for col, val in enumerate(row_data, 1):
            c = ws_membres.cell(row=i, column=col, value=val)
            c.border = border
            c.fill = fill(row_bg)
            c.alignment = Alignment(horizontal='center' if col > 1 else 'left')
    _autofit(ws_membres, [28, 20, 18, 18, 12, 22, 16, 18, 16, 16, 16, 16, 18])

    # ══════════════════════════════════════════════════
    # Feuille 4 : Détail par Kourel — jamais par séance, cela mélangerait les kourels.
    # Pour chaque kourel : son encadrement, chacun de ses membres avec son assiduité
    # PROPRE (justifications d'absence incluses), puis ses éventuels invités hors kourel.
    # ══════════════════════════════════════════════════
    ws = wb.create_sheet("Détail par Kourel")
    blocs = _build_detail_par_kourel(kourel_qs, qs, stats_membres)
    row = 1
    for bloc in blocs:
        k, enc = bloc['kourel'], bloc['encadrement']
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=11)
        c = ws.cell(row=row, column=1, value=f"KOUREL : {k.nom.upper()}  —  {bloc['nb_seances']} séance(s) sur la période")
        c.font = Font(bold=True, size=12, color='FFFFFF')
        c.fill = fill(_GREEN)
        row += 1
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=11)
        infos = f"Responsable : {enc['responsable']}  |  1er MC : {enc['maitre_1']}  |  2ème MC : {enc['maitre_2']}  |  Jewrine : {enc['jewrine']}"
        ws.cell(row=row, column=1, value=infos).font = Font(italic=True, size=9)
        row += 1

        _write_header_row(ws, row, [
            'Membre', 'Séances attendues (rép.)', 'Présents (dont retards)', 'dont retards',
            'dont hors kourel (sans prestation)', 'Abs. justifiées', 'Abs. non justifiées',
            'Taux répétitions (%)', 'Prestations attendues', 'Prestations présent', 'Taux prestations (%)'
        ], bg_color=_GOLD, text_color='000000')
        row += 1
        for s in bloc['membres']:
            taux_rep = s['taux_presence']
            taux_prest = s.get('taux_prestation')
            row_data = [
                s['nom'], s['nb_seances_attendues'], s['nb_presents'], s['nb_retards'],
                s['nb_hors_kourel_sanction'], s['nb_abs_just'], s['nb_abs_non_just'],
                f"{taux_rep}%" if taux_rep is not None else '—',
                s.get('nb_prest_attendues', 0), s.get('nb_prest_presents', 0),
                f"{taux_prest}%" if taux_prest is not None else '—',
            ]
            taux_ref = taux_rep if taux_rep is not None else (taux_prest or 0)
            row_bg = 'E8F5E9' if taux_ref >= 80 else ('FFF9E6' if taux_ref >= 50 else 'FFEBEE')
            for col, val in enumerate(row_data, 1):
                c = ws.cell(row=row, column=col, value=val)
                c.border = border
                c.fill = fill(row_bg)
                c.alignment = Alignment(horizontal='center' if col > 1 else 'left')
            row += 1
            # Détail des justifications d'absence de ce membre, s'il y en a.
            for j in s['justifications']:
                ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=11)
                date_str = j['date'].strftime('%d/%m/%Y') if j['date'] else ''
                ws.cell(row=row, column=1, value='   ↳ Justification').font = Font(italic=True, size=8)
                ws.cell(row=row, column=2, value=f"{date_str} — {j['seance']} : {j['justification']}").font = Font(italic=True, size=8)
                row += 1

        if bloc['invites']:
            row += 1
            ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=11)
            ws.cell(row=row, column=1, value="Invités d'un autre kourel (venus assister à la répétition)").font = Font(bold=True, size=10, color=_GREEN)
            row += 1
            _write_header_row(ws, row, ['Membre', 'Kourel d\'origine', 'Nb venues'] + [''] * 8, bg_color=_LIGHT, text_color='000000')
            row += 1
            for inv in bloc['invites']:
                row_data = [inv['nom'], inv['kourel_origine'], inv['nb_venues']] + [''] * 8
                for col, val in enumerate(row_data, 1):
                    c = ws.cell(row=row, column=col, value=val)
                    c.border = border
                row += 1
        row += 2  # espace entre kourels

    _autofit(ws, [26, 18, 20, 12, 20, 16, 18, 16, 16, 16, 16])

    from io import BytesIO
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ────────────────────────── PDF export ──────────────────────────────────────

def export_rapport_pdf(date_debut=None, date_fin=None, kourel_id=None):
    """Export PDF complet : stats, fiche kourels, taux membres, détail séances."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
        )
    except ImportError:
        return None

    qs = _get_queryset(date_debut, date_fin, kourel_id)
    from io import BytesIO
    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=1.5*cm, leftMargin=1.5*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    styles = getSampleStyleSheet()
    GREEN = colors.HexColor('#2D5F3F')
    GOLD  = colors.HexColor('#C9A961')
    LIGHT = colors.HexColor('#F4EAD5')
    RED   = colors.HexColor('#CC3333')
    ORANGE = colors.HexColor('#E6A817')

    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], textColor=GREEN, fontSize=16, spaceAfter=4)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], textColor=GREEN, fontSize=12, spaceAfter=4)
    small = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8)

    def tbl_style(header_color=GREEN, stripe=LIGHT):
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), header_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, stripe]),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ])

    elements = []
    periode_str = (
        f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}"
        if date_debut and date_fin else "Toutes les séances créées"
    )

    try:
        from utils.pdf_header import build_pdf_header
        elements.extend(build_pdf_header("Rapport des séances de répétition", periode_str))
    except Exception:
        elements.append(Paragraph("Rapport des séances de répétition", h1_style))
        elements.append(Paragraph(f"Période : {periode_str}", styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))

    # ── Statistiques globales ──
    # Les présences "invité" (membre d'un AUTRE kourel) sont exclues du taux global ; elles
    # ne reflètent l'assiduité propre d'aucun kourel particulier, affichées à part.
    # "present_hors_kourel" (membre du kourel présent mais n'ayant pas presté) compte, lui,
    # normalement — c'est une présence réelle, juste sans participation active.
    presences_all = list(PresenceSeance.objects.filter(seance__in=qs).exclude(statut='present_invite'))
    nb_hors_kourel = PresenceSeance.objects.filter(seance__in=qs, statut='present_invite').count()
    nb_total = len(presences_all)
    nb_presents = sum(1 for p in presences_all if p.statut in PresenceSeance.STATUTS_PRESENT)
    nb_retards = sum(1 for p in presences_all if p.statut == 'present_retard')
    nb_sans_prestation = sum(1 for p in presences_all if p.statut == 'present_hors_kourel')
    nb_abs_just = sum(1 for p in presences_all if p.statut == 'absent_justifie')
    nb_abs_non_just = sum(1 for p in presences_all if p.statut == 'absent_non_justifie')
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0

    elements.append(Paragraph('Statistiques globales', h2_style))
    stats_data = [['Indicateur', 'Valeur']] + [
        ['Nombre de séances', str(qs.count())],
        ['Total marquages présence', str(nb_total)],
        ['Présents (dont retards et hors kourel)', str(nb_presents)],
        ['  dont en retard', str(nb_retards)],
        ['  dont présent sans avoir presté (hors kourel)', str(nb_sans_prestation)],
        ['Absents justifiés', str(nb_abs_just)],
        ['Absents non justifiés', str(nb_abs_non_just)],
        ['Taux de présence global', f'{taux_presence}%'],
        ["Présences invités d'un autre kourel (hors calcul)", str(nb_hors_kourel)],
    ]
    stats_table = Table(stats_data, colWidths=[9*cm, 5*cm])
    stats_table.setStyle(tbl_style(header_color=GOLD))
    elements.append(stats_table)
    elements.append(Spacer(1, 0.8*cm))

    # ── Fiche Kourels ──
    elements.append(Paragraph('Encadrement des Kourels', h2_style))
    elements.append(Spacer(1, 0.3*cm))
    kourel_qs = Kourel.objects.select_related(
        'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
    ).prefetch_related('membres').order_by('ordre', 'nom')
    if kourel_id:
        kourel_qs = kourel_qs.filter(pk=kourel_id)

    kourel_headers = [['Kourel', 'Responsable', '1er MC', '2ème MC', 'Jewrine', 'Membres']]
    kourel_rows = []
    for k in kourel_qs:
        enc = _kourel_encadrement(k)
        kourel_rows.append([k.nom, enc['responsable'], enc['maitre_1'], enc['maitre_2'], enc['jewrine'], str(k.membres.count())])
    if kourel_rows:
        kt = Table(kourel_headers + kourel_rows, colWidths=[3.5*cm, 3.5*cm, 3*cm, 3*cm, 3*cm, 2*cm])
        kt.setStyle(tbl_style())
        elements.append(kt)
    else:
        elements.append(Paragraph('Aucun kourel trouvé.', styles['Normal']))
    elements.append(Spacer(1, 0.8*cm))

    # ── Taux par membre ──
    qs_prestations = _get_queryset(date_debut, date_fin, kourel_id, type_seance='prestation')
    stats_membres = _get_stats_par_membre_combinees(qs, qs_prestations)
    elements.append(Paragraph('Taux de présence par membre', h2_style))
    elements.append(Spacer(1, 0.3*cm))
    if stats_membres:
        m_headers = [['Membre', 'Kourel', 'Attendues', 'Présents', 'Retards', 'Abs. just.', 'Abs. non just.', 'Taux rép. (%)', 'Taux prest. (%)']]
        m_data = [
            [s['nom'], s['kourel'], str(s['nb_seances_attendues']), str(s['nb_presents']), str(s['nb_retards']),
             str(s['nb_abs_just']), str(s['nb_abs_non_just']),
             f"{s['taux_repetition']}%" if s['taux_repetition'] is not None else '—',
             f"{s['taux_prestation']}%" if s['taux_prestation'] is not None else '—']
            for s in stats_membres
        ]
        mt = Table(m_headers + m_data, colWidths=[3.8*cm, 2.3*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.8*cm, 1.8*cm, 1.6*cm, 1.6*cm])
        style = tbl_style()
        # Coloration conditionnelle du meilleur taux disponible (répétition en priorité)
        for i, s in enumerate(stats_membres, 1):
            taux = s['taux_repetition'] if s['taux_repetition'] is not None else (s['taux_prestation'] or 0)
            color = colors.HexColor('#E8F5E9') if taux >= 80 else (colors.HexColor('#FFF9E6') if taux >= 50 else colors.HexColor('#FFEBEE'))
            style.add('BACKGROUND', (7, i), (8, i), color)
        mt.setStyle(style)
        elements.append(mt)
    else:
        elements.append(Paragraph('Aucun membre concerné.', styles['Normal']))
    elements.append(Spacer(1, 0.8*cm))

    # ── Détail par Kourel — jamais par séance, cela mélangerait les kourels entre eux ──
    elements.append(PageBreak())
    elements.append(Paragraph('Détail par Kourel', h2_style))
    elements.append(Spacer(1, 0.3*cm))

    kourel_qs_detail = Kourel.objects.select_related(
        'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
    ).prefetch_related('membres').order_by('ordre', 'nom')
    if kourel_id:
        kourel_qs_detail = kourel_qs_detail.filter(pk=kourel_id)
    blocs = _build_detail_par_kourel(kourel_qs_detail, qs, stats_membres)

    for bloc in blocs:
        k, enc = bloc['kourel'], bloc['encadrement']
        elements.append(Paragraph(f"{k.nom} — {bloc['nb_seances']} séance(s) sur la période", h2_style))
        elements.append(Paragraph(
            f"Responsable : {enc['responsable']} | 1er MC : {enc['maitre_1']} | "
            f"2ème MC : {enc['maitre_2']} | Jewrine : {enc['jewrine']}", small
        ))
        elements.append(Spacer(1, 0.2*cm))

        if bloc['membres']:
            mh = [['Membre', 'Attendues', 'Présents', 'Retards', 'Abs. just.', 'Abs. non just.', 'Taux rép. (%)', 'Taux prest. (%)']]
            mrows = [
                [s['nom'], str(s['nb_seances_attendues']), str(s['nb_presents']), str(s['nb_retards']),
                 str(s['nb_abs_just']), str(s['nb_abs_non_just']),
                 f"{s['taux_presence']}%" if s['taux_presence'] is not None else '—',
                 f"{s.get('taux_prestation')}%" if s.get('taux_prestation') is not None else '—']
                for s in bloc['membres']
            ]
            kt = Table(mh + mrows, colWidths=[4*cm, 1.8*cm, 1.8*cm, 1.4*cm, 1.8*cm, 1.8*cm, 1.5*cm, 1.5*cm])
            kstyle = tbl_style(header_color=GOLD)
            for i, s in enumerate(bloc['membres'], 1):
                taux = s['taux_presence'] if s['taux_presence'] is not None else (s.get('taux_prestation') or 0)
                color = colors.HexColor('#E8F5E9') if taux >= 80 else (colors.HexColor('#FFF9E6') if taux >= 50 else colors.HexColor('#FFEBEE'))
                kstyle.add('BACKGROUND', (6, i), (7, i), color)
            kt.setStyle(kstyle)
            elements.append(kt)

            # Justifications d'absence, listées sous le tableau pour ne pas l'alourdir.
            justifs = [(s['nom'], j) for s in bloc['membres'] for j in s['justifications']]
            if justifs:
                elements.append(Spacer(1, 0.2*cm))
                elements.append(Paragraph("<b>Justifications d'absence :</b>", small))
                for nom, j in justifs:
                    date_str = j['date'].strftime('%d/%m/%Y') if j['date'] else ''
                    elements.append(Paragraph(f"• {nom} — {date_str} ({j['seance']}) : {j['justification']}", small))
        else:
            elements.append(Paragraph('Aucun membre dans ce kourel.', styles['Normal']))

        if bloc['invites']:
            elements.append(Spacer(1, 0.3*cm))
            elements.append(Paragraph("<b>Invités d'un autre kourel</b> (venus assister à la répétition) :", small))
            for inv in bloc['invites']:
                elements.append(Paragraph(
                    f"• {inv['nom']} (kourel : {inv['kourel_origine']}) — {inv['nb_venues']} venue(s)", small
                ))

        elements.append(Spacer(1, 0.7*cm))

    doc.build(elements)
    buf.seek(0)
    return buf


# ────────────────────────── CSV export ──────────────────────────────────────

def export_rapport_csv(date_debut=None, date_fin=None, kourel_id=None):
    """Export CSV complet des séances de répétition, avec infos encadrement kourel."""
    import csv
    from io import StringIO

    qs = _get_queryset(date_debut, date_fin, kourel_id)
    buf = StringIO()
    writer = csv.writer(buf, delimiter=';')

    periode_str = (
        f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}"
        if date_debut and date_fin else "Toutes les séances créées"
    )
    writer.writerow([f'Rapport séances de répétition DBM — Période : {periode_str}'])

    presences_all = list(PresenceSeance.objects.filter(seance__in=qs).exclude(statut='present_invite'))
    nb_hors_kourel = PresenceSeance.objects.filter(seance__in=qs, statut='present_invite').count()
    nb_total = len(presences_all)
    nb_presents = sum(1 for p in presences_all if p.statut in PresenceSeance.STATUTS_PRESENT)
    nb_retards = sum(1 for p in presences_all if p.statut == 'present_retard')
    nb_sans_prestation = sum(1 for p in presences_all if p.statut == 'present_hors_kourel')
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0
    writer.writerow([
        f'Séances: {qs.count()} | Présences: {nb_total} | Présents (dont retards et hors kourel): {nb_presents} '
        f'(dont {nb_retards} retard(s), {nb_sans_prestation} hors kourel sans prestation) | Taux: {taux_presence}% '
        f"| Invités d'un autre kourel (hors calcul): {nb_hors_kourel}"
    ])
    writer.writerow([])

    # Section kourels
    writer.writerow(['=== ENCADREMENT DES KOURELS ==='])
    writer.writerow(['Kourel', 'Responsable', '1er Maître de cœur', '2ème Maître de cœur', 'Jewrine', 'Nb membres'])
    kourel_qs = Kourel.objects.select_related(
        'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
    ).prefetch_related('membres').order_by('ordre', 'nom')
    if kourel_id:
        kourel_qs = kourel_qs.filter(pk=kourel_id)
    for k in kourel_qs:
        enc = _kourel_encadrement(k)
        writer.writerow([k.nom, enc['responsable'], enc['maitre_1'], enc['maitre_2'], enc['jewrine'], k.membres.count()])
    writer.writerow([])

    # Section taux par membre
    qs_prestations = _get_queryset(date_debut, date_fin, kourel_id, type_seance='prestation')
    stats_membres = _get_stats_par_membre_combinees(qs, qs_prestations)
    writer.writerow(['=== TAUX DE PRESENCE PAR MEMBRE ==='])
    writer.writerow(['Membre', 'Kourel', 'Séances attendues (rép.)', 'Présents', 'Retards',
                      'Hors kourel (sans prestation)', 'Abs. justifiés', 'Abs. non justifiés',
                      'Taux répétitions (%)', 'Prestations attendues', 'Prestations présent',
                      'Taux prestations (%)', "Invités (autre kourel)"])
    for s in stats_membres:
        writer.writerow([
            s['nom'], s['kourel'], s['nb_seances_attendues'], s['nb_presents'], s['nb_retards'],
            s['nb_hors_kourel_sanction'], s['nb_abs_just'], s['nb_abs_non_just'],
            f"{s['taux_repetition']}%" if s['taux_repetition'] is not None else '—',
            s['nb_prest_attendues'], s['nb_prest_presents'],
            f"{s['taux_prestation']}%" if s['taux_prestation'] is not None else '—',
            s['nb_hors_kourel'],
        ])
    writer.writerow([])

    # Section détail par kourel — jamais par séance, cela mélangerait les kourels entre eux.
    writer.writerow(['=== DETAIL PAR KOUREL ==='])
    kourel_qs_detail = Kourel.objects.select_related(
        'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
    ).prefetch_related('membres').order_by('ordre', 'nom')
    if kourel_id:
        kourel_qs_detail = kourel_qs_detail.filter(pk=kourel_id)
    blocs = _build_detail_par_kourel(kourel_qs_detail, qs, stats_membres)

    for bloc in blocs:
        k, enc = bloc['kourel'], bloc['encadrement']
        writer.writerow([])
        writer.writerow([f"KOUREL : {k.nom}", f"{bloc['nb_seances']} séance(s) sur la période"])
        writer.writerow([f"Responsable: {enc['responsable']} | 1er MC: {enc['maitre_1']} | "
                          f"2ème MC: {enc['maitre_2']} | Jewrine: {enc['jewrine']}"])
        writer.writerow(['Membre', 'Séances attendues', 'Présents', 'Retards',
                          'Hors kourel (sans prestation)', 'Abs. justifiées', 'Abs. non justifiées',
                          'Taux répétitions (%)', 'Prestations attendues', 'Prestations présent', 'Taux prestations (%)'])
        for s in bloc['membres']:
            writer.writerow([
                s['nom'], s['nb_seances_attendues'], s['nb_presents'], s['nb_retards'],
                s['nb_hors_kourel_sanction'], s['nb_abs_just'], s['nb_abs_non_just'],
                f"{s['taux_presence']}%" if s['taux_presence'] is not None else '—',
                s.get('nb_prest_attendues', 0), s.get('nb_prest_presents', 0),
                f"{s.get('taux_prestation')}%" if s.get('taux_prestation') is not None else '—',
            ])
            for j in s['justifications']:
                date_str = j['date'].strftime('%d/%m/%Y') if j['date'] else ''
                writer.writerow(['', f"↳ Justification ({date_str}, {j['seance']})", j['justification']])
        if bloc['invites']:
            writer.writerow(["Invités d'un autre kourel :"])
            for inv in bloc['invites']:
                writer.writerow(['', inv['nom'], f"kourel: {inv['kourel_origine']}", f"{inv['nb_venues']} venue(s)"])

    from io import BytesIO
    out = BytesIO(buf.getvalue().encode('utf-8-sig'))
    out.seek(0)
    return out


# ────────────────────────── Export fiche membres kourel ─────────────────────

def export_membres_kourel_excel(kourel_id):
    """Export Excel de la liste des membres d'un kourel avec leurs infos."""
    try:
        import openpyxl
        from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
        from openpyxl.utils import get_column_letter
    except ImportError:
        return None

    try:
        kourel = Kourel.objects.select_related(
            'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
        ).prefetch_related('membres').get(pk=kourel_id)
    except Kourel.DoesNotExist:
        return None

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Membres — {kourel.nom[:20]}"

    thin = Side(style='thin')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    def fill(hex_color):
        return PatternFill('solid', fgColor=hex_color)

    # Entête kourel
    ws.merge_cells('A1:G1')
    ws['A1'] = f"FICHE KOUREL : {kourel.nom.upper()}"
    ws['A1'].font = Font(bold=True, size=14, color='FFFFFF')
    ws['A1'].fill = fill(_GREEN)
    ws['A1'].alignment = Alignment(horizontal='center')

    enc = _kourel_encadrement(kourel)
    info_rows = [
        ('Responsable', enc['responsable']),
        ('1er Maître de cœur', enc['maitre_1']),
        ('2ème Maître de cœur', enc['maitre_2']),
        ('Jewrine', enc['jewrine']),
        ('Nombre de membres', str(kourel.membres.count())),
    ]
    for i, (label, val) in enumerate(info_rows, 2):
        ws.cell(row=i, column=1, value=label).font = Font(bold=True)
        ws.cell(row=i, column=1).fill = fill(_LIGHT)
        ws.cell(row=i, column=2, value=val)
        ws.cell(row=i, column=1).border = border
        ws.cell(row=i, column=2).border = border

    # En-tête membres
    header_row = len(info_rows) + 3
    headers = ['#', 'Nom complet', 'Téléphone', 'Email', 'Profession', 'Catégorie', 'Cellule']
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=header_row, column=col, value=h)
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = fill(_GOLD)
        c.border = border
        c.alignment = Alignment(horizontal='center')

    for i, membre in enumerate(kourel.membres.all().order_by('last_name', 'first_name'), 1):
        row_num = header_row + i
        row_data = [
            i,
            membre.get_full_name(),
            membre.telephone or '—',
            membre.email or '—',
            membre.profession or '—',
            membre.get_categorie_display() if hasattr(membre, 'get_categorie_display') else membre.categorie or '—',
            membre.get_cellule_display() if hasattr(membre, 'get_cellule_display') else membre.cellule or '—',
        ]
        bg = _LIGHT if i % 2 == 0 else 'FFFFFF'
        for col, val in enumerate(row_data, 1):
            c = ws.cell(row=row_num, column=col, value=val)
            c.border = border
            c.fill = fill(bg)
            c.alignment = Alignment(horizontal='center' if col == 1 else 'left')

    col_widths = [5, 28, 16, 28, 20, 16, 16]
    for col, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = w

    from io import BytesIO
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def export_membres_kourel_pdf(kourel_id):
    """Export PDF de la fiche membres d'un kourel."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    except ImportError:
        return None

    try:
        kourel = Kourel.objects.select_related(
            'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
        ).prefetch_related('membres').get(pk=kourel_id)
    except Kourel.DoesNotExist:
        return None

    from io import BytesIO
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    GREEN = colors.HexColor('#2D5F3F')
    GOLD  = colors.HexColor('#C9A961')
    LIGHT = colors.HexColor('#F4EAD5')

    h1 = ParagraphStyle('H1', parent=styles['Heading1'], textColor=GREEN, fontSize=15)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], textColor=GREEN, fontSize=11)

    elements = []
    elements.append(Paragraph(f"Fiche Kourel : {kourel.nom}", h1))
    elements.append(Spacer(1, 0.4*cm))

    enc = _kourel_encadrement(kourel)
    enc_data = [
        ['Responsable', enc['responsable']],
        ['1er Maître de cœur', enc['maitre_1']],
        ['2ème Maître de cœur', enc['maitre_2']],
        ['Jewrine', enc['jewrine']],
        ['Nombre de membres', str(kourel.membres.count())],
    ]
    enc_tbl = Table(enc_data, colWidths=[6*cm, 11*cm])
    enc_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), LIGHT),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(enc_tbl)
    elements.append(Spacer(1, 0.6*cm))

    elements.append(Paragraph("Liste des membres", h2))
    elements.append(Spacer(1, 0.3*cm))

    membres = list(kourel.membres.all().order_by('last_name', 'first_name'))
    if membres:
        m_headers = [['#', 'Nom complet', 'Téléphone', 'Email', 'Catégorie']]
        m_data = [
            [str(i), m.get_full_name(), m.telephone or '—', m.email or '—',
             m.get_categorie_display() if hasattr(m, 'get_categorie_display') else m.categorie or '—']
            for i, m in enumerate(membres, 1)
        ]
        mt = Table(m_headers + m_data, colWidths=[1*cm, 5*cm, 3.5*cm, 5*cm, 3*cm])
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), GOLD),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT]),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(mt)
    else:
        elements.append(Paragraph('Aucun membre enregistré dans ce kourel.', styles['Normal']))

    doc.build(elements)
    buf.seek(0)
    return buf
