function DebugPrint(...)
    local netTable = CustomNetTables:GetTableValue("debug", "log")
    if netTable ~= nil and tonumber(netTable.value) == 1 then
        print(...)
    end
end

function DebugPrintTable(t, indent, done)
    local netTable = CustomNetTables:GetTableValue("debug", "log")
    if netTable ~= nil and tonumber(netTable.value) == 1 then
        PrintTable(t, indent, done, DebugPrint)
    end
end