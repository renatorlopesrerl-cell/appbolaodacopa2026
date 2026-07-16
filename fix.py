import sys
with open('c:/Users/renat/OneDrive/Desktop/appbolaodacopa2026/appbolaodacopa2026/pages/LeagueDetailsBrasileirao.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = 'className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"\n                                >\n'
end_str = '                    {/* Quando só tem uma competição (liga mono-competição), mostrar o selector simples original */}'

idx1 = content.find(start_str)
if idx1 == -1:
    print('start string not found')
    sys.exit(1)
idx1 += len(start_str)

idx2 = content.find(end_str, idx1)
if idx2 == -1:
    print('end string not found')
    sys.exit(1)

replacement = '''                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900">Pontuação Total</option>
                                    {Array.from({ length: 20 }, (_, i) => i + 19).map(round => (
                                        <option key={round} value={String(round)} className="bg-white dark:bg-gray-800 text-gray-900">{round}ª Rodada</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {allowedCompetitions.length === 1 && allowedCompetitions.includes('copa_do_brasil') && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Copa do Brasil</option>
                                    <option value="copa_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="copa_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="copa_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
'''

new_content = content[:idx1] + replacement + content[idx2:]
with open('c:/Users/renat/OneDrive/Desktop/appbolaodacopa2026/appbolaodacopa2026/pages/LeagueDetailsBrasileirao.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('File restored successfully')
