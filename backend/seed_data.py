import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import hashlib
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.finance import Account, Transaction
from app.models.project import Project, ProjectMilestone, ProjectFile, ProjectSyndicateMember
from app.models.idea import Idea
from app.models.task import Task, TaskBid
from app.models.chat import Chat, Message, ChatMember
from app.models.notification import Notification
from app.models.certificate import DepositCertificate
from app.models.matching import MatchingInvitation


async def seed():
    print("===> Начинаем заполнение базы проверенными тестовыми данными Tochka Rosta...")

    # 0. Применение всех колонок и моделей
    async with engine.begin() as conn:
        alter_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS inn VARCHAR(30)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS ogrn VARCHAR(30)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS documents JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS initiated_by_admin BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(50)",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'completed'",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_details JSON",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_syndicated BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_min_deposit NUMERIC(15, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_soft_cap NUMERIC(15, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_status VARCHAR(50) NOT NULL DEFAULT 'open'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS external_links JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_files JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_embedding JSON",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_type VARCHAR(50)",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_id INTEGER",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS chat_type VARCHAR(50) NOT NULL DEFAULT 'direct'",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
            "ALTER TABLE chats ALTER COLUMN investor_id DROP NOT NULL",
            "ALTER TABLE chats ALTER COLUMN lab_id DROP NOT NULL",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_structured_data JSON",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_docx_path VARCHAR(512)",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_pdf_path VARCHAR(512)",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestones JSON NOT NULL DEFAULT '[]'::json",
        ]
        for stmt in alter_statements:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Проверяем, есть ли уже данные
        res = await session.execute(select(User).where(User.email == "imet-ran@science-park.ru"))
        if res.scalar_one_or_none():
            print("===> База уже содержит тестовые НИИ и проекты. Очистка или обновление...")

        # 1. ГЛАВНЫЙ АДМИНИСТРАТОР
        admin_res = await session.execute(select(User).where(User.email == "admin@tochkarosta.ru"))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@tochkarosta.ru",
                hashed_password=hash_password("admin12345"),
                full_name="Главный Администратор",
                organization_name="Платформа «Точка Роста»",
                role="investor",
                status="active",
                verification_status="verified",
                is_admin=True,
            )
            session.add(admin)
            await session.flush()
            session.add(Account(user_id=admin.id, available_balance=Decimal("100000000.00"), frozen_balance=Decimal("0.00")))
            print("  + Администратор: admin@tochkarosta.ru / admin12345")

        # 2. НАУЧНО-ИССЛЕДОВАТЕЛЬСКИЕ ИНСТИТУТЫ (НИИ)
        labs_data = [
            {
                "email": "imet-ran@science-park.ru",
                "full_name": "Комлев Владимир Сергеевич",
                "org_name": "ФГБУН Институт металлургии и материаловедения им. А.А. Байкова РАН",
                "inn": "7728168971",
                "ogrn": "1027739023412",
                "rep": "Комлев Владимир Сергеевич (Член-корр. РАН, Директор)",
                "website": "https://imet.ras.ru",
                "bio": "Ведущий научно-исследовательский институт РАН в области фундаментального материаловедения, порошковой металлургии, аддитивных технологий, синтеза жаропрочных интерметаллидов и биорезорбируемых титановых имплантатов. Аттестованная лаборатория РФА и СЭМ микроскопии.",
                "patents": [
                    {"number": "RU 2749102 C1", "title": "Способ селективного лазерного сплавления пористо-градиентных биорезорбируемых имплантатов из сплавов титан-ниобий-тантал", "year": 2023, "date": "15.04.2023"},
                    {"number": "RU 2684112 C2", "title": "Жаропрочный никелевый интерметаллидный сплав для лопаток газотурбинных установок морского базирования", "year": 2022, "date": "20.11.2022"},
                    {"number": "RU 2781405 C1", "title": "Композиционный наноструктурированный материал с эффектом памяти формы и сверхэластичностью", "year": 2024, "date": "10.02.2024"}
                ],
                "balance": Decimal("6500000.00")
            },
            {
                "email": "ibch@biopharm-lab.ru",
                "full_name": "Габибов Александр Габибович",
                "org_name": "ФГБУН Институт биоорганической химии им. М.М. Шемякина и Ю.А. Овчинникова РАН",
                "inn": "7728038840",
                "ogrn": "1027739007462",
                "rep": "Габибов Александр Габибович (Академик РАН, Директор)",
                "website": "https://ibch.ru",
                "bio": "Крупнейший в России научный центр физико-химической биологии и биотехнологий. Разработка инновационных пептидных терапевтических препаратов, моноклональных антител, таргетных онколитических систем адресной доставки лекарств и генной терапии.",
                "patents": [
                    {"number": "RU 2765431 C1", "title": "Гуманизированное моноклональное антитело к рецептору PD-L1 для таргетной иммунотерапии солидных опухолей", "year": 2023, "date": "28.09.2023"},
                    {"number": "RU 2712980 C2", "title": "Фармацевтическая композиция на основе пептидного биорегулятора для стимуляции нейрогенеза", "year": 2022, "date": "14.05.2022"},
                    {"number": "RU 2790114 C1", "title": "Система адресной доставки мРНК в гепатоциты на основе биоразлагаемых липидных наночастиц LNP", "year": 2024, "date": "18.01.2024"}
                ],
                "balance": Decimal("8200000.00")
            },
            {
                "email": "ioffe-lab@phys-tech.ru",
                "full_name": "Иванов Сергей Викторович",
                "org_name": "ФГБУН Физико-технический институт им. А.Ф. Иоффе РАН",
                "inn": "7802059433",
                "ogrn": "1027801540898",
                "rep": "Иванов Сергей Викторович (Член-корр. РАН)",
                "website": "https://ioffe.ru",
                "bio": "Один из крупнейших физических институтов России. Лидер в области физики полупроводников, оптоэлектроники, наногетероструктур, солнечной фотовольтаики и сверхчувствительных квантовых сенсоров терагерцового диапазона.",
                "patents": [
                    {"number": "RU 2758901 C1", "title": "Каскадный фотоэлектрический преобразователь солнечного излучения на основе наногетероструктур AlGaAs/GaAs с КПД более 38%", "year": 2023, "date": "11.11.2023"},
                    {"number": "RU 2704321 C2", "title": "Сверхчувствительный квантовый магнитометр на центрах окраски NV в монокристаллах алмаза", "year": 2022, "date": "04.08.2022"},
                    {"number": "RU 2779845 C1", "title": "Инжекционный полупроводниковый лазер среднего инфракрасного диапазона на квантовых точках", "year": 2024, "date": "05.03.2024"}
                ],
                "balance": Decimal("7400000.00")
            },
            {
                "email": "rnd-bauman@engineering-center.ru",
                "full_name": "Гордин Михаил Валерьевич",
                "org_name": "МГТУ им. Н.Э. Баумана (Инжиниринговый центр)",
                "inn": "7702070139",
                "ogrn": "1027739178820",
                "rep": "Гордин Михаил Валерьевич (Ректор, д.т.н.)",
                "website": "https://bmstu.ru",
                "bio": "Головной научно-образовательный центр прецизионного машиностроения, промышленной робототехники, полимерных композиционных материалов и беспилотных авиационных комплексов специального и двойного назначения.",
                "patents": [
                    {"number": "RU 2732910 C1", "title": "Адаптивный шестиосевой робот-манипулятор с оптико-тактильной обратной связью для микросборки", "year": 2023, "date": "19.06.2023"},
                    {"number": "RU 2698711 C2", "title": "Углепластиковый термостойкий лонжерон крыла переменной жесткости для высотных БПЛА", "year": 2022, "date": "12.12.2022"}
                ],
                "balance": Decimal("5300000.00")
            },
            {
                "email": "itmo-lab@cognitive-ai.ru",
                "full_name": "Васильев Владимир Николаевич",
                "org_name": "ФГАОУ ВО Национальный исследовательский университет ИТМО",
                "inn": "7813045591",
                "ogrn": "1027806868154",
                "rep": "Васильев Владимир Николаевич (Член-корр. РАН, Ректор)",
                "website": "https://itmo.ru",
                "bio": "Национальный центр когнитивных разработок, фотоники, квантовых коммуникаций, генеративного искусственного интеллекта и САПР проектирования интегральных микросхем.",
                "patents": [
                    {"number": "RU 2741980 C1", "title": "Нейросетевой алгоритм автоматизированного синтеза топологии цифровых интегральных схем (EDA-система)", "year": 2023, "date": "25.07.2023"},
                    {"number": "RU 2789123 C1", "title": "Квантово-криптографическая система защищенного распределения ключей для оптоволоконных магистралей", "year": 2024, "date": "29.01.2024"}
                ],
                "balance": Decimal("9100000.00")
            },
            {
                "email": "catalysis-lab@sbras.ru",
                "full_name": "Бухтияров Валерий Иванович",
                "org_name": "ФГБУН Институт катализа им. Г.К. Борескова СО РАН",
                "inn": "5408100234",
                "ogrn": "1025403648600",
                "rep": "Бухтияров Валерий Иванович (Академик РАН, Директор)",
                "website": "https://catalysis.ru",
                "bio": "Крупнейший в мире специализированный институт в области гетерогенного катализа, процессов глубокой переработки углеводородного сырья, водородной энергетики и технологий утилизации углекислого газа.",
                "patents": [
                    {"number": "RU 2750119 C1", "title": "Высокоактивный платино-палладиевый катализатор риформинга углеводородных газов с увеличенным ресурсом регенерации", "year": 2023, "date": "14.09.2023"},
                    {"number": "RU 2719876 C2", "title": "Мембранно-каталитический реактор получения чистого водорода из природного газа", "year": 2022, "date": "08.02.2022"}
                ],
                "balance": Decimal("5900000.00")
            }
        ]

        labs_map = {}
        for ld in labs_data:
            existing = (await session.execute(select(User).where(User.email == ld["email"]))).scalar_one_or_none()
            if not existing:
                existing = User(
                    email=ld["email"],
                    hashed_password=hash_password("TestPass123!"),
                    full_name=ld["full_name"],
                    organization_name=ld["org_name"],
                    role="lab",
                    status="active",
                    verification_status="verified",
                    inn=ld["inn"],
                    ogrn=ld["ogrn"],
                    representative_name=ld["rep"],
                    website_url=ld["website"],
                    bio=ld["bio"],
                    patents_info=ld["patents"],
                    documents=[
                        {"name": "Устав_института_2023.pdf", "path": "/uploads/ustav.pdf", "size": 2450000, "type": "charter"},
                        {"name": "Лицензия_на_научную_деятельность.pdf", "path": "/uploads/license.pdf", "size": 1180000, "type": "license"},
                        {"name": "Выписка_ЕГРЮЛ_ФНС.pdf", "path": "/uploads/egrul.pdf", "size": 890000, "type": "tax_extract"}
                    ],
                    external_links=[
                        {"title": "Профиль в РИНЦ / Elibrary", "url": "https://elibrary.ru"},
                        {"title": "Scopus Profile", "url": "https://scopus.com"},
                        {"title": "Официальный сайт РАН", "url": "https://ras.ru"}
                    ],
                    portfolio_files=[
                        {"id": "doc-1", "name": "Научно-технический_отчет_НИОКР_2023.pdf", "url": "/uploads/report2023.pdf", "size": 4200000, "uploaded_at": "2023-12-20T10:00:00Z"},
                        {"id": "doc-2", "name": "Презентация_исследовательских_мощностей.pdf", "url": "/uploads/presentation.pdf", "size": 8900000, "uploaded_at": "2024-02-15T14:30:00Z"}
                    ]
                )
                session.add(existing)
                await session.flush()
                session.add(Account(user_id=existing.id, available_balance=ld["balance"], frozen_balance=Decimal("0.00")))
                print(f"  + НИИ: {ld['org_name']} ({ld['email']})")
            labs_map[ld["email"]] = existing

        # 3. ИНВЕСТОРЫ И КОРПОРАТИВНЫЕ ЗАКАЗЧИКИ
        investors_data = [
            {
                "email": "yandex-rd@invest-corp.ru",
                "full_name": "Савиновский Артем Геннадьевич",
                "org_name": "ООО «Яндекс» (Корпоративный фонд R&D)",
                "inn": "7704217370",
                "ogrn": "1027700229193",
                "rep": "Савиновский Артем Геннадьевич (Генеральный директор)",
                "bio": "Корпоративный фонд технологических инвестиций и заказов прикладных исследований в области автономного транспорта, больших языковых моделей, робототехники и квантовых алгоритмов.",
                "balance": Decimal("55000000.00")
            },
            {
                "email": "sber-deeptech@venture-fund.ru",
                "full_name": "Греф Герман Оскарович",
                "org_name": "ПАО Сбербанк (R&D Центр DeepTech)",
                "inn": "7707083893",
                "ogrn": "1027700132195",
                "rep": "Греф Герман Оскарович (Президент, Председатель Правления)",
                "bio": "Венчурный центр финансирования опытно-промышленных разработок, корпоративных R&D акселераторов, квантовых сенсоров и систем искусственного интеллекта нового поколения.",
                "balance": Decimal("85000000.00")
            },
            {
                "email": "gpn-innovations@energy-tech.ru",
                "full_name": "Михайлов Денис Андреевич",
                "org_name": "ООО «Газпромнефть - Промышленные Инновации»",
                "inn": "7838087541",
                "ogrn": "1197847167584",
                "rep": "Михайлов Денис Андреевич (Директор дирекции инноваций)",
                "bio": "Центр прикладных НИОКР в области глубокой нефтехимии, синтеза катализаторов, антикоррозийных композитных покрытий и технологий водородной декарбонизации.",
                "balance": Decimal("42000000.00")
            },
            {
                "email": "uec-invest@aero-engines.ru",
                "full_name": "Артюхов Вадим Владиславович",
                "org_name": "АО «Объединенная двигателестроительная корпорация» (ОДК)",
                "inn": "7731405090",
                "ogrn": "1107746405364",
                "rep": "Артюхов Вадим Владиславович (Главный конструктор инновационных проектов)",
                "bio": "Головной отраслевой заказчик разработок в области высокотемпературных сплавов, жаропрочных керамических композитов, аддитивного выращивания турбинных лопаток и испытаний двигателей.",
                "balance": Decimal("65000000.00")
            },
            {
                "email": "biocad-ventures@pharma-fund.ru",
                "full_name": "Морозов Дмитрий Валентинович",
                "org_name": "ООО «Биокад Венчурс» (Фармацевтический фонд)",
                "inn": "7816434440",
                "ogrn": "1089847053530",
                "rep": "Морозов Дмитрий Валентинович (Управляющий партнер фонда)",
                "bio": "Венчурный фонд прямых инвестиций в ранние стадии биомедицинских разработок: таргетные онкологические биополимеры, синтез моноклональных антител, генная терапия и мРНК-вакцины.",
                "balance": Decimal("38000000.00")
            },
            {
                "email": "sokolov-invest@angel-syndicate.ru",
                "full_name": "ИП Соколов Алексей Дмитриевич (Бизнес-ангел)",
                "org_name": "ИП Соколов Алексей Дмитриевич",
                "inn": "500100732259",
                "ogrn": "318505300054321",
                "rep": "Соколов Алексей Дмитриевич",
                "bio": "Частный аккредитованный инвестор, лидер синдиката бизнес-ангелов по финансированию ранних стадий технологических разработок и софинансированию университетских spin-off проектов.",
                "balance": Decimal("18000000.00")
            }
        ]

        investors_map = {}
        for idata in investors_data:
            existing = (await session.execute(select(User).where(User.email == idata["email"]))).scalar_one_or_none()
            if not existing:
                existing = User(
                    email=idata["email"],
                    hashed_password=hash_password("TestPass123!"),
                    full_name=idata["full_name"],
                    organization_name=idata["org_name"],
                    role="investor",
                    status="active",
                    verification_status="verified",
                    inn=idata["inn"],
                    ogrn=idata["ogrn"],
                    representative_name=idata["rep"],
                    bio=idata["bio"],
                )
                session.add(existing)
                await session.flush()
                session.add(Account(user_id=existing.id, available_balance=idata["balance"], frozen_balance=Decimal("0.00")))
                print(f"  + Инвестор: {idata['org_name']} ({idata['email']})")
            investors_map[idata["email"]] = existing

        await session.commit()

        # 4. ПОЛНОСТЬЮ ЗАПОЛНЕННЫЕ ПРОЕКТЫ С ГОСТ-ОТЧЕТАМИ И СИНДИКАТАМИ
        projects_seed = [
            {
                "title": "Разработка жаропрочных монокристаллических лопаток ТВД нового поколения",
                "investor": investors_map["uec-invest@aero-engines.ru"],
                "lab": labs_map["imet-ran@science-park.ru"],
                "budget": Decimal("18500000.00"),
                "status": "active",
                "is_syndicated": True,
                "soft_cap": Decimal("12000000.00"),
                "min_deposit": Decimal("1000000.00"),
                "syndication_status": "funded",
                "syndicate": [
                    {"investor": investors_map["uec-invest@aero-engines.ru"], "amount": Decimal("12000000.00"), "share": Decimal("64.86"), "lead": True, "ip_type": "exclusive_license"},
                    {"investor": investors_map["sokolov-invest@angel-syndicate.ru"], "amount": Decimal("4000000.00"), "share": Decimal("21.62"), "lead": False, "ip_type": "royalty"},
                    {"investor": investors_map["gpn-innovations@energy-tech.ru"], "amount": Decimal("2500000.00"), "share": Decimal("13.52"), "lead": False, "ip_type": "patent_co_owner"},
                ],
                "milestones": [
                    {
                        "step": 1,
                        "title": "Термодинамическое моделирование и разработка химического состава сплава Ni-Al-Co-Re",
                        "amount": Decimal("4500000.00"),
                        "status": "completed",
                        "raw_report": "Выполнено квантово-механическое моделирование межатомных связей в интерметаллидной матрице Ni3Al с микролегированием рением (Re) и рутением (Ru). Рассчитана фазовая диаграмма ликвидус-солидус. Экспериментально выплавлена тестовая серия слитков массой 50 кг. Исследования микроструктуры подтвердили отсутствие фаз ТПУ.",
                        "ai_summary": "Этап 1 успешно завершен. Разработан химический состав жаропрочного никелевого сплава с добавлением 4.5% Re. Моделирование показало повышение рабочей температуры на 45°C без снижения длительной прочности.",
                        "gost": {
                            "document_type": "Научно-технический отчет по ГОСТ 7.32-2017",
                            "code": "НИОКР-ОДК-ИМЕТ-2024-Э1",
                            "executive_summary": "Синтезирован перспективный жаропрочный монокристаллический сплав нового поколения для лопаток турбин газотурбинных двигателей.",
                            "conclusions": "Состав соответствует требованиям ТЗ заказчика. Рекомендован к переходу на этап направленной кристаллизации.",
                            "authors": ["Комлев В.С.", "Морозов П.А.", "Сидоров В.Н."]
                        }
                    },
                    {
                        "step": 2,
                        "title": "Выращивание монокристаллических заготовок лопаток методом высокоскоростной направленной кристаллизации (HRS)",
                        "amount": Decimal("7000000.00"),
                        "status": "escrow_funded",
                        "raw_report": "На установке УВНК-9 проведена кристаллизация 12 монокристаллических заготовок лопаток с ориентацией [001]. Рентгеновская топография показала отклонение кристаллографической оси менее 4 градусов. Пористость не превышает 0.05 об.%.",
                        "ai_summary": "Этап 2 находится на стадии верификации испытаний. Получены 12 монокристаллов лопаток с идеальной кристаллографической ориентацией [001]. Дефектов макроструктуры не выявлено.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Стендовые термомеханические и усталостные испытания при температуре 1200°C",
                        "amount": Decimal("7000000.00"),
                        "status": "pending_funds",
                        "raw_report": None,
                        "ai_summary": None,
                        "gost": None
                    }
                ]
            },
            {
                "title": "Таргетная терапевтическая наносистема доставки мРНК в клетки печени",
                "investor": investors_map["biocad-ventures@pharma-fund.ru"],
                "lab": labs_map["ibch@biopharm-lab.ru"],
                "budget": Decimal("14000000.00"),
                "status": "active",
                "is_syndicated": True,
                "soft_cap": Decimal("8000000.00"),
                "min_deposit": Decimal("1000000.00"),
                "syndication_status": "funded",
                "syndicate": [
                    {"investor": investors_map["biocad-ventures@pharma-fund.ru"], "amount": Decimal("10000000.00"), "share": Decimal("71.43"), "lead": True, "ip_type": "exclusive_license"},
                    {"investor": investors_map["sber-deeptech@venture-fund.ru"], "amount": Decimal("4000000.00"), "share": Decimal("28.57"), "lead": False, "ip_type": "royalty"},
                ],
                "milestones": [
                    {
                        "step": 1,
                        "title": "Синтез библиотеки катионных липидов и скрининг трансфекционной активности in vitro",
                        "amount": Decimal("4200000.00"),
                        "status": "completed",
                        "raw_report": "Синтезировано 18 уникальных ионизируемых аминолипидов с биоразлагаемыми сложноэфирными линкерами. Проведен анализ цитотоксичности и эффективности доставки репортерной мРНК люциферазы в культуру клеток HepG2. Выявлены два лидерных соединения L-07 и L-14 с эффективностью экспрессии более 94%.",
                        "ai_summary": "Синтезирована библиотека из 18 липидов. Определены два соединения-лидера L-07 и L-14 с трансфекционной эффективностью выше зарубежных аналогов (MC3).",
                        "gost": {
                            "document_type": "Отчет об НИР (ГОСТ 7.32-2017)",
                            "code": "БИОФАРМ-ИБХ-мРНК-2024",
                            "executive_summary": "Разработана отечественная платформа синтеза ионизируемых липидов для генно-терапевтических препаратов.",
                            "conclusions": "Препараты продемонстрировали высокую биологическую безопасность. Рекомендовано масштабирование процесса микрофлюидного капсулирования."
                        }
                    },
                    {
                        "step": 2,
                        "title": "Оптимизация состава липидных наночастиц LNP и оценка биораспределения in vivo",
                        "amount": Decimal("5800000.00"),
                        "status": "escrow_funded",
                        "raw_report": "С использованием микрофлюидного картриджа проведена инкапсуляция модельной мРНК. Размер частиц составил 78 ± 4 нм, индекс полидисперсности 0.08. Исследования биораспределения на грызунах показали селективное накопление в ткани печени (более 85% дозы).",
                        "ai_summary": "Сформированы стабильные наночастицы 78 нм. In vivo тесты подтвердили высокую тропность к паренхиме печени.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Доклинические испытания фармакокинетики и токсичности опытной серии",
                        "amount": Decimal("4000000.00"),
                        "status": "pending_funds",
                        "raw_report": None,
                        "ai_summary": None,
                        "gost": None
                    }
                ]
            },
            {
                "title": "Каскадный фотоэлектрический модуль высокой эффективности на основе AlGaAs/GaAs",
                "investor": investors_map["gpn-innovations@energy-tech.ru"],
                "lab": labs_map["ioffe-lab@phys-tech.ru"],
                "budget": Decimal("12000000.00"),
                "status": "active",
                "is_syndicated": False,
                "milestones": [
                    {
                        "step": 1,
                        "title": "Молекулярно-пучковая эпитаксия наногетероструктур с туннельными переходами",
                        "amount": Decimal("3600000.00"),
                        "status": "completed",
                        "raw_report": "На ростовой установке Riber 45 выращены трехпереходные гетероструктуры GaInP/GaInAs/Ge. Оптимизированы параметры прозрачных широкозонных контактных слоев AlInP. Измеренный фотоотклик подтвердил согласование токов каскадов при спектре AM1.5D.",
                        "ai_summary": "Успешно выращены гетероструктуры с туннельными диодами. Согласование каскадов обеспечивает потенциальный КПД до 40%.",
                        "gost": None
                    },
                    {
                        "step": 2,
                        "title": "Формирование прецизионных омических контактов и антиотражающих покрытий",
                        "amount": Decimal("4400000.00"),
                        "status": "escrow_funded",
                        "raw_report": "Методом электронно-лучевого испарения нанесены многослойные просветляющие покрытия TiO2/SiO2. Коэффициент интегрального отражения снижен до 1.8% в диапазоне 350-1800 нм.",
                        "ai_summary": "Нанесены двухслойные просветляющие пленки. Оптические потери минимизированы.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Климатические и ресурсные испытания опытного модуля при концентрации солнечного потока 500x",
                        "amount": Decimal("4000000.00"),
                        "status": "pending_funds",
                        "raw_report": None,
                        "ai_summary": None,
                        "gost": None
                    }
                ]
            },
            {
                "title": "Автономный шестиосевой робот-манипулятор для чистых комнат микроэлектроники ISO 4",
                "investor": investors_map["yandex-rd@invest-corp.ru"],
                "lab": labs_map["rnd-bauman@engineering-center.ru"],
                "budget": Decimal("16000000.00"),
                "status": "active",
                "is_syndicated": False,
                "milestones": [
                    {
                        "step": 1,
                        "title": "Эскизное проектирование кинематической схемы и безлюфтовых волновых редукторов",
                        "amount": Decimal("4800000.00"),
                        "status": "completed",
                        "raw_report": "Разработана кинематическая схема манипулятора с грузоподъемностью 5 кг и радиусом зоны досягаемости 850 мм. Спроектированы волновые редукторы с кулачковыми генераторами волн. Уровень пылевыделения шарниров приведен в соответствие с классом ISO 4.",
                        "ai_summary": "Спроектирован механический узел робота с повторяемостью ±0.015 мм. Конструкция защищена от пыления в вакууме и чистой зоне.",
                        "gost": None
                    },
                    {
                        "step": 2,
                        "title": "Изготовление опытного образца и интеграция системы машинного зрения",
                        "amount": Decimal("6400000.00"),
                        "status": "escrow_funded",
                        "raw_report": "Произведена механическая обработка корпусных деталей из титано-алюминиевого сплава. Установлены серводвигатели с абсолютными оптическими энкодерами 23 бит. Подключена бинокулярная стереокамера технического зрения.",
                        "ai_summary": "Собран первый прототип манипулятора, интегрирована система распознавания полупроводниковых пластин 300 мм.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Разработка адаптивных алгоритмов безаварийного манипулирования кремниевыми пластинами",
                        "amount": Decimal("4800000.00"),
                        "status": "pending_funds",
                        "raw_report": None,
                        "ai_summary": None,
                        "gost": None
                    }
                ]
            },
            {
                "title": "Нейросетевая платформа проектирования и топологической верификации СБИС (EDA AI)",
                "investor": investors_map["sber-deeptech@venture-fund.ru"],
                "lab": labs_map["itmo-lab@cognitive-ai.ru"],
                "budget": Decimal("22000000.00"),
                "status": "completed",
                "is_syndicated": True,
                "soft_cap": Decimal("15000000.00"),
                "min_deposit": Decimal("2000000.00"),
                "syndication_status": "closed",
                "syndicate": [
                    {"investor": investors_map["sber-deeptech@venture-fund.ru"], "amount": Decimal("15000000.00"), "share": Decimal("68.18"), "lead": True, "ip_type": "exclusive_license"},
                    {"investor": investors_map["yandex-rd@invest-corp.ru"], "amount": Decimal("7000000.00"), "share": Decimal("31.82"), "lead": False, "ip_type": "royalty"},
                ],
                "milestones": [
                    {
                        "step": 1,
                        "title": "Разработка графовых нейросетевых архитектур для автотрассировки межсоединений СБИС",
                        "amount": Decimal("6600000.00"),
                        "status": "completed",
                        "raw_report": "Разработана модель GNN (Graph Neural Network), прогнозирующая плотность заторов проводников на ранних этапах логического синтеза. Скорость оценки топологии возросла в 14 раз по сравнению с традиционными алгоритмами A*.",
                        "ai_summary": "Создана нейросеть предсказания емкостных задержек и плотности трассировки. Достигнуто ускорение этапа синтеза в 14 раз.",
                        "gost": None
                    },
                    {
                        "step": 2,
                        "title": "Обучение модели на датасете открытых топологий микропроцессоров архитектуры RISC-V",
                        "amount": Decimal("8400000.00"),
                        "status": "completed",
                        "raw_report": "Сформирован обучающий датасет из 450 топологий 32/64-битных ядер RISC-V в нормах 28 нм и 65 нм. Модель достигла точности совпадения DRC-правил 99.4%.",
                        "ai_summary": "Модель обучена на базе RISC-V, обеспечивает генерацию без DRC-нарушений на 99.4%.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Интеграция в сквозной маршрут проектирования и верификация тестового кристалла",
                        "amount": Decimal("7000000.00"),
                        "status": "completed",
                        "raw_report": "Платформа интегрирована с промышленными EDA-инструментами. Успешно сгенерирован GDSII-файл тестового микроконтроллера нейросетевой обработки сигналов.",
                        "ai_summary": "Проект полностью завершен. Сформирован производственный GDSII файл микросхемы.",
                        "gost": None
                    }
                ]
            },
            {
                "title": "Мембранно-каталитический реактор получения чистого водорода из попутного нефтяного газа",
                "investor": investors_map["gpn-innovations@energy-tech.ru"],
                "lab": labs_map["catalysis-lab@sbras.ru"],
                "budget": Decimal("9500000.00"),
                "status": "active",
                "is_syndicated": False,
                "milestones": [
                    {
                        "step": 1,
                        "title": "Синтез структурированных каталитических пен и нанокомпозитных палладиевых мембран",
                        "amount": Decimal("2850000.00"),
                        "status": "completed",
                        "raw_report": "Методом магнетронного распыления получены беспористые мембраны толщиной 2.5 мкм на пористых подложках из оксида алюминия. Селективность по водороду превышает 10 000.",
                        "ai_summary": "Синтезированы тонкопленочные мембраны высокой селективности к H2.",
                        "gost": None
                    },
                    {
                        "step": 2,
                        "title": "Создание пилотной модульной реакторной установки производительностью 50 нм³/ч",
                        "amount": Decimal("4750000.00"),
                        "status": "escrow_funded",
                        "raw_report": "Смонтирован модульный реактор с катализатором пароуглекислотного риформинга. Проведены гидравлические и газовые опрессовки при давлении 25 атм.",
                        "ai_summary": "Смонтирован пилотный реактор 50 нм³/ч, ведутся пусконаладочные работы.",
                        "gost": None
                    },
                    {
                        "step": 3,
                        "title": "Проведение непрерывных 1000-часовых ресурсных испытаний на реальном сырьевом газе",
                        "amount": Decimal("1900000.00"),
                        "status": "pending_funds",
                        "raw_report": None,
                        "ai_summary": None,
                        "gost": None
                    }
                ]
            }
        ]

        for pdata in projects_seed:
            existing_p = (await session.execute(
                select(Project).where(
                    Project.title == pdata["title"],
                    Project.investor_id == pdata["investor"].id,
                    Project.lab_id == pdata["lab"].id
                )
            )).scalar_one_or_none()

            if not existing_p:
                proj = Project(
                    title=pdata["title"],
                    investor_id=pdata["investor"].id,
                    lab_id=pdata["lab"].id,
                    total_budget=pdata["budget"],
                    status=pdata["status"],
                    is_syndicated=pdata["is_syndicated"],
                    syndication_soft_cap=pdata.get("soft_cap", Decimal("0.00")),
                    syndication_min_deposit=pdata.get("min_deposit", Decimal("0.00")),
                    syndication_status=pdata.get("syndication_status", "open"),
                )
                session.add(proj)
                await session.flush()

                # Этапы
                for mdata in pdata["milestones"]:
                    ms = ProjectMilestone(
                        project_id=proj.id,
                        step_number=mdata["step"],
                        title=mdata["title"],
                        amount=mdata["amount"],
                        status=mdata["status"],
                        raw_report=mdata.get("raw_report"),
                        ai_summary=mdata.get("ai_summary"),
                        gost_structured_data=mdata.get("gost"),
                    )
                    session.add(ms)

                # Синдикаты
                if pdata.get("syndicate"):
                    for sm in pdata["syndicate"]:
                        mem = ProjectSyndicateMember(
                            project_id=proj.id,
                            investor_id=sm["investor"].id,
                            invested_amount=sm["amount"],
                            share_percent=sm["share"],
                            is_lead=sm["lead"],
                            ip_share_type=sm["ip_type"],
                        )
                        session.add(mem)

                # Чат сделки
                chat = Chat(
                    investor_id=pdata["investor"].id,
                    lab_id=pdata["lab"].id,
                    project_id=proj.id,
                    title=f"Сделка: {proj.title[:40]}",
                    chat_type="project"
                )
                session.add(chat)
                await session.flush()

                msg = Message(
                    chat_id=chat.id,
                    sender_id=pdata["investor"].id,
                    content=f"Здравствуйте! Заключена сделка по проекту «{proj.title}». Техническое задание согласовано, финансирование открыто.",
                )
                session.add(msg)

                print(f"  + Проект: {proj.title}")

        # 5. КАТАЛОГ РАЗРАБОТОК И ИДЕЙ (IDEAS)
        ideas_seed = [
            {
                "author": labs_map["imet-ran@science-park.ru"],
                "type": "lab_tech",
                "title": "Технология прямого лазерного выращивания персонализированных титановых имплантатов",
                "summary": "Разработана запатентованная технология селективного лазерного плавления (SLM) пористых биосовместимых имплантатов с регулируемым модулем упругости, идентичным костной ткани человека (15-30 ГПа). Снижает риск асептического расшатывания на 80%. Пройдены стендовые и токсикологические испытания.",
                "category": "Новые материалы",
                "trl": 7,
                "budget": Decimal("8500000.00"),
                "milestones": [
                    {"step": 1, "title": "Оптимизация параметров сканирования лазера для титанового порошка ВТ6", "amount": 2500000},
                    {"step": 2, "title": "Изготовление пилотной партии тазобедренных компонентов", "amount": 3500000},
                    {"step": 3, "title": "Сертификационные клинические испытания", "amount": 2500000}
                ]
            },
            {
                "author": labs_map["ibch@biopharm-lab.ru"],
                "type": "lab_tech",
                "title": "Онколитический рекомбинантный пептид адресного действия против глиобластомы",
                "summary": "Инновационное биотехнологическое соединение пептидной природы, селективно связывающееся с рецепторами CD133 на мембранах стволовых опухолевых клеток головного мозга и индуцирующее апоптоз без повреждения здоровых нейронов. Показана 4-кратная задержка роста опухоли в модели in vivo.",
                "category": "Биотехнологии",
                "trl": 6,
                "budget": Decimal("14000000.00"),
                "milestones": [
                    {"step": 1, "title": "Биосинтез и хроматографическая очистка пептида субстанции", "amount": 4000000},
                    {"step": 2, "title": "Исследование фармакодинамики и терапевтического индекса", "amount": 6000000},
                    {"step": 3, "title": "Разработка лекарственной формы для инфузий", "amount": 4000000}
                ]
            },
            {
                "author": labs_map["ioffe-lab@phys-tech.ru"],
                "type": "lab_tech",
                "title": "Квантовый оптический магнитометр для бесконтактного мониторинга микротрещин в трубопроводах",
                "summary": "Высокочувствительный сенсор на спиновых центрах окраски (NV-центры) в синтетическом монокристалле алмаза. Позволяет регистрировать магнитные аномалии с разрешением до 10 пТл/Гц^0.5 при комнатной температуре. Предназначен для внутрипутевой и внешней дефектоскопии толстостенных газопроводов высокого давления.",
                "category": "Приборостроение",
                "trl": 6,
                "budget": Decimal("9800000.00"),
                "milestones": [
                    {"step": 1, "title": "Синтез алмазных пластин с высокой концентрацией NV-центров", "amount": 2800000},
                    {"step": 2, "title": "Сборка оптического миниатюрного сенсорного блока с лазерной накачкой", "amount": 4000000},
                    {"step": 3, "title": "Полевые стендовые испытания на образцах нефтегазовых труб", "amount": 3000000}
                ]
            },
            {
                "author": labs_map["rnd-bauman@engineering-center.ru"],
                "type": "lab_tech",
                "title": "Коллаборативный робот-манипулятор для опасных химических производств (Ex-защита)",
                "summary": "Взрывозащищенный промышленный кобот с интегрированной защитой оболочки по стандарту 1Ex d IIB T4 Gb. Оснащен приводами прямого момента, системой тактильного очувствления и алгоритмами совместной безопасной работы с человеком на химических складах и участках синтеза активных фармсубстанций.",
                "category": "ИИ и робототехника",
                "trl": 7,
                "budget": Decimal("12500000.00"),
                "milestones": [
                    {"step": 1, "title": "Проектирование герметичных узлов вращения с барьерной защитой", "amount": 3500000},
                    {"step": 2, "title": "Сборка прототипа и калибровка бездатчикового контроля усилий", "amount": 5000000},
                    {"step": 3, "title": "Сертификация во ВНИИФТРИ на взрывозащищенность", "amount": 4000000}
                ]
            },
            {
                "author": labs_map["itmo-lab@cognitive-ai.ru"],
                "type": "lab_tech",
                "title": "Генеративная мультимодальная ИИ-система синтеза химических молекул с заданными свойствами",
                "summary": "Программный комплекс на основе диффузионных графовых нейронных сетей для de novo генерации низкомолекулярных соединений с прогнозируемым сродством к белкам-мишеням и оптимальными ADMET-профилями. Сокращает время первичного скрининга кандидатов лекарств в 20 раз.",
                "category": "ИИ и робототехника",
                "trl": 8,
                "budget": Decimal("11000000.00"),
                "milestones": [
                    {"step": 1, "title": "Обучение модели на датасете ZINC20 и ChEMBL", "amount": 3000000},
                    {"step": 2, "title": "Модуль физико-химической валидации и предсказания синтетической доступности", "amount": 4500000},
                    {"step": 3, "title": "Веб-интерфейс интеграции с лабораторным оборудованием", "amount": 3500000}
                ]
            },
            {
                "author": labs_map["catalysis-lab@sbras.ru"],
                "type": "lab_tech",
                "title": "Нанокатализаторы утилизации CO2 в ценные олефины и метанол",
                "summary": "Биметаллические нанокатализаторы Fe-Co/CeO2 для прямого гидрирования диоксида углерода (CO2) в легкие олефины C2-C4 и химическое сырье. Обеспечивают конверсию CO2 свыше 42% при температуре 300°C с рекордной селективностью по ценным углеводородам.",
                "category": "Энергетика",
                "trl": 6,
                "budget": Decimal("7200000.00"),
                "milestones": [
                    {"step": 1, "title": "Синтез наноразмерных носителей методом гидротермального синтеза", "amount": 2200000},
                    {"step": 2, "title": "Испытания активности в проточной каталитической установке высокого давления", "amount": 3000000},
                    {"step": 3, "title": "Оценка срока службы и регенерируемости катализатора", "amount": 2000000}
                ]
            },
            # Запросы от бизнеса (investor_idea)
            {
                "author": investors_map["uec-invest@aero-engines.ru"],
                "type": "investor_idea",
                "title": "Запрос на разработку керамических матричных композитов (КМК) с рабочей температурой 1450°C",
                "summary": "Ищем научную группу и профильный институт для создания технологии получения композиционных материалов на основе карбида кремния SiC/SiC для сопловых аппаратов перспективных авиационных двигателей. Требуется стойкость к высокоскоростному окислительному потоку.",
                "category": "Новые материалы",
                "trl": 4,
                "budget": Decimal("25000000.00"),
                "milestones": [
                    {"step": 1, "title": "Выбор армирующих SiC-волокон и метода химического газофазного осаждения CVI", "amount": 7000000},
                    {"step": 2, "title": "Изготовление плоских образцов и нанесение защитных покрытий EBC", "amount": 10000000},
                    {"step": 3, "title": "Испытания на газодинамическом стенде при температуре 1450°C", "amount": 8000000}
                ]
            },
            {
                "author": investors_map["yandex-rd@invest-corp.ru"],
                "type": "investor_idea",
                "title": "Запрос на разработку твердотельного лидара ближнего радиуса на кремниевой фотонике",
                "summary": "Требуется разработка чипа твердотельного LiDAR на основе кремний-фотонных фазированных антенных решеток (OPA) с длиной волны 1550 нм для беспилотного транспорта. Дальность обнаружения пешеходов от 0.2 до 50 метров без движущихся зеркал.",
                "category": "Микроэлектроника",
                "trl": 4,
                "budget": Decimal("18000000.00"),
                "milestones": [
                    {"step": 1, "title": "Моделирование оптической фазированной решетки на Si-платформе", "amount": 5000000},
                    {"step": 2, "title": "Изготовление тестового кремний-фотонного кристалла на фаундри", "amount": 8000000},
                    {"step": 3, "title": "Сборка опытного лидарного модуля с TOF-обработкой сигналов", "amount": 5000000}
                ]
            }
        ]

        for idata in ideas_seed:
            existing_i = (await session.execute(
                select(Idea).where(Idea.title == idata["title"], Idea.author_id == idata["author"].id)
            )).scalar_one_or_none()

            if not existing_i:
                content_to_hash = f"{idata['title']}:{idata['summary']}:{idata['author'].id}".encode("utf-8")
                f_hash = hashlib.sha256(content_to_hash).hexdigest()

                new_idea = Idea(
                    author_id=idata["author"].id,
                    type=idata["type"],
                    title=idata["title"],
                    summary=idata["summary"],
                    category=idata["category"],
                    trl_level=idata["trl"],
                    budget_total=idata["budget"],
                    milestones=idata["milestones"],
                    file_hash=f_hash,
                    moderation_status="approved",
                )
                session.add(new_idea)
                print(f"  + РИД/Идея: {new_idea.title}")

        # 6. БИРЖА R&D-ЗАДАЧ И ТЕНДЕРОВ (TASKS & BIDS)
        tasks_seed = [
            {
                "creator": investors_map["gpn-innovations@energy-tech.ru"],
                "title": "Синтез полимерного самовосстанавливающегося покрытия для защиты труб в условиях вечной мерзлоты",
                "description": "Техническое задание на разработку эпоксидно-полиуретанового композиционного состава с микрокапсулами гидрофобного реагента для автоматического залечивания микротрещин при температурах эксплуатации от -60°C до +40°C. Должно выдерживать грунтовые подвижки и коррозионные среды.",
                "budget": Decimal("8500000.00"),
                "deadline": "9 месяцев",
                "milestones": [
                    {"step": 1, "title": "Синтез микрокапсул с ингибитором коррозии и оптимизация оболочки", "amount": 2500000},
                    {"step": 2, "title": "Создание полимерной матрицы и испытания на самозалечивание микротрещин", "amount": 3500000},
                    {"step": 3, "title": "Климатические испытания в камере соляного тумана при -60°C", "amount": 2500000}
                ],
                "bids": [
                    {
                        "lab": labs_map["imet-ran@science-park.ru"],
                        "proposal": "ИМЕТ РАН обладает опытом синтеза полимер-неорганических нанокомпозитов и аккредитованными климатическими камерами. Предлагаем использовать запатентованные полимочевинные микрокапсулы.",
                        "budget": Decimal("8200000.00"),
                    },
                    {
                        "lab": labs_map["catalysis-lab@sbras.ru"],
                        "proposal": "Институт катализа СО РАН готов разработать функциональные добавки и антикоррозийные промоторы адгезии для северных трубопроводов.",
                        "budget": Decimal("8500000.00"),
                    }
                ]
            },
            {
                "creator": investors_map["uec-invest@aero-engines.ru"],
                "title": "Разработка акустических метаматериалов для снижения шума реактивного сопла турбореактивного двигателя",
                "description": "Разработка широкополосных звукопоглощающих сотовых конструкций с субволновыми резонаторами для интеграции в мотогондолу и смеситель реактивного сопла. Снижение акустического давления на 6-8 дБ в диапазоне 500-2500 Гц без увеличения веса конструкции более чем на 5%.",
                "budget": Decimal("11000000.00"),
                "deadline": "12 месяцев",
                "milestones": [
                    {"step": 1, "title": "Численное аэроакустическое моделирование ячеек метаматериала", "amount": 3000000},
                    {"step": 2, "title": "Изготовление титановых сотовых панелей методом лазерной пайки", "amount": 4500000},
                    {"step": 3, "title": "Испытания на акустическом пульсирующем стенде горячего потока", "amount": 3500000}
                ],
                "bids": [
                    {
                        "lab": labs_map["rnd-bauman@engineering-center.ru"],
                        "proposal": "Научно-учебный центр Бауманского университета имеет готовую математическую модель акустического поглощения метаструктур и опыт изготовления легких титановых сотопанелей.",
                        "budget": Decimal("10800000.00"),
                    }
                ]
            },
            {
                "creator": investors_map["sber-deeptech@venture-fund.ru"],
                "title": "Система защищенного квантового распределения ключей для мультиплексных волоконно-оптических сетей (DWDM)",
                "description": "Создание прототипа приемо-передающего терминала квантового шифрования, работающего одновременно с 16 каналами классического высокоскоростного интернет-трафика (100G) в одном оптическом волокне стандарта SMF-28 без интерференционных помех.",
                "budget": Decimal("15000000.00"),
                "deadline": "10 месяцев",
                "milestones": [
                    {"step": 1, "title": "Разработка сверхузкополосных оптических фильтров подавления спонтанного рамановского рассеяния", "amount": 4500000},
                    {"step": 2, "title": "Сборка блоков генерации одиночных фотонов на длине волны 1550.12 нм", "amount": 6000000},
                    {"step": 3, "title": "Полевые тесты на действующей оптической магистрали протяженностью 80 км", "amount": 4500000}
                ],
                "bids": [
                    {
                        "lab": labs_map["itmo-lab@cognitive-ai.ru"],
                        "proposal": "Лаборатория квантовых коммуникаций Университета ИТМО является ведущим разработчиком в проекте квантовой магистрали РЖД. Имеем готовые решения подавления шумов до 100 дБ.",
                        "budget": Decimal("14500000.00"),
                    },
                    {
                        "lab": labs_map["ioffe-lab@phys-tech.ru"],
                        "proposal": "ФТИ им. Иоффе предлагает полупроводниковые однофотонные детекторы собственной разработки на лавинных фотодиодах с квантовой эффективностью 25%.",
                        "budget": Decimal("15000000.00"),
                    }
                ]
            },
            {
                "creator": labs_map["imet-ran@science-park.ru"],
                "title": "НИОКР-кооперация: разработка математической модели кинетики кристаллизации для порошков жаропрочных сплавов",
                "description": "Институт металлургии РАН открывает совместный конкурс для математических и физических центров на создание термодинамической модели кинетики неравновесной кристаллизации металлических капель при газовой атомизации расплава.",
                "budget": Decimal("4500000.00"),
                "deadline": "6 месяцев",
                "milestones": [
                    {"step": 1, "title": "Математическая постановка задачи тепломассопереноса капли в потоке аргона", "amount": 1500000},
                    {"step": 2, "title": "Калибровка по скоростной пирометрии и верификация фазового состава", "amount": 2000000},
                    {"step": 3, "title": "Программный модуль интеграции в производственный комплекс", "amount": 1000000}
                ],
                "bids": []
            }
        ]

        for tdata in tasks_seed:
            existing_t = (await session.execute(
                select(Task).where(Task.title == tdata["title"], Task.investor_id == tdata["creator"].id)
            )).scalar_one_or_none()

            if not existing_t:
                new_task = Task(
                    investor_id=tdata["creator"].id,
                    title=tdata["title"],
                    description=tdata["description"],
                    budget=tdata["budget"],
                    deadline=tdata["deadline"],
                    milestones=tdata["milestones"],
                    moderation_status="approved",
                    status="open",
                )
                session.add(new_task)
                await session.flush()

                # Bids
                for bdata in tdata.get("bids", []):
                    bid = TaskBid(
                        task_id=new_task.id,
                        lab_id=bdata["lab"].id,
                        proposal_text=bdata["proposal"],
                        proposed_budget=bdata["budget"],
                        status="pending"
                    )
                    session.add(bid)
                    await session.flush()

                    # Chat for bid
                    chat = Chat(
                        investor_id=new_task.investor_id,
                        lab_id=bdata["lab"].id,
                        context_type="task_bid",
                        context_id=bid.id,
                        title=f"Отклик: {new_task.title[:40]}",
                        chat_type="direct"
                    )
                    session.add(chat)
                    await session.flush()

                    msg = Message(
                        chat_id=chat.id,
                        sender_id=bdata["lab"].id,
                        content=f"НИИ «{bdata['lab'].organization_name}» подал отклик на вашу задачу «{new_task.title}» с бюджетом {bid.proposed_budget:,.2f} ₽.\n\nСопроводительное сообщение:\n{bid.proposal_text}"
                    )
                    session.add(msg)

                print(f"  + Тендер/Задача: {new_task.title} (откликов: {len(tdata.get('bids', []))})")

        await session.commit()
        print("===> ВСЕ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО ЗАГРУЖЕНЫ В БАЗУ ДАННЫХ!")


if __name__ == "__main__":
    asyncio.run(seed())
